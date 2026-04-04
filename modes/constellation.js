// ══════════════════════════════════════════════════════
// CONSTELLATION BUILDER (interactive mode)
// ══════════════════════════════════════════════════════

// Cursor state
const cursor = { x: 0, y: 0, speed: 5 };
const cursorKeys = { left: false, right: false, up: false, down: false };
let cursorEl = null;

// Points and connections
const constellationPoints = [];
const constellationLines = [];
const MAX_POINTS = 80;
const CONNECT_DIST = 250;

// Light painting state
let paintHeld = false;
let paintHoldStart = 0;
const HOLD_THRESHOLD = 200; // ms before hold becomes a paint stroke
let isPainting = false;
const paintTrails = [];
let currentTrail = null;
const TRAIL_SAMPLE_DIST = 8; // min distance between trail samples
const MAX_TRAILS = 40;

// Drift and growth
const driftField = { offsetX: 0, offsetY: 0 };

function initConstellation() {
  cursor.x = W / 2;
  cursor.y = H / 2;

  // Create cursor DOM element
  cursorEl = document.createElement('div');
  cursorEl.className = 'constellation-cursor visible';
  document.body.appendChild(cursorEl);
  updateCursorEl();

  // Hide ambient panel but keep toolbar (back button)
  setPanelVisible(false);
}

function updateCursorEl() {
  if (cursorEl) {
    cursorEl.style.left = cursor.x + 'px';
    cursorEl.style.top = cursor.y + 'px';
  }
}

function placePoint() {
  if (constellationPoints.length >= MAX_POINTS) return;

  const point = {
    x: cursor.x,
    y: cursor.y,
    ox: cursor.x,
    oy: cursor.y,
    ci: Math.floor(Math.random() * 6),
    birth: globalTime,
    size: 3 + Math.random() * 2,
    phase: Math.random() * TWO_PI,
  };
  constellationPoints.push(point);

  // Connect to nearby points
  for (let i = 0; i < constellationPoints.length - 1; i++) {
    const other = constellationPoints[i];
    const dx = point.x - other.x;
    const dy = point.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CONNECT_DIST) {
      constellationLines.push({
        a: constellationPoints.length - 1,
        b: i,
        dist: dist,
        birth: globalTime,
        growProgress: 0,
      });
    }
  }
}

// ── Paint hold detection ──
function paintStart() {
  paintHeld = true;
  paintHoldStart = globalTime;
  isPainting = false;
}

function paintEnd() {
  if (!paintHeld) return;
  paintHeld = false;
  if (!isPainting) {
    // Short tap — place a point
    placePoint();
  } else {
    // End current trail
    if (currentTrail && currentTrail.points.length > 1) {
      currentTrail = null;
    }
    isPainting = false;
    if (cursorEl) cursorEl.classList.remove('painting');
  }
}

function paintUpdate() {
  if (!paintHeld) return;

  // Check if hold has crossed threshold
  if (!isPainting && (globalTime - paintHoldStart) >= HOLD_THRESHOLD) {
    isPainting = true;
    if (cursorEl) cursorEl.classList.add('painting');
    // Start a new trail
    if (paintTrails.length >= MAX_TRAILS) paintTrails.shift();
    currentTrail = {
      points: [{ x: cursor.x, y: cursor.y, ox: cursor.x, oy: cursor.y }],
      ci: Math.floor(Math.random() * 6),
      birth: globalTime,
      phase: Math.random() * TWO_PI,
    };
    paintTrails.push(currentTrail);
  }

  // Sample trail points while painting
  if (isPainting && currentTrail) {
    const last = currentTrail.points[currentTrail.points.length - 1];
    const dx = cursor.x - last.ox;
    const dy = cursor.y - last.oy;
    if (dx * dx + dy * dy >= TRAIL_SAMPLE_DIST * TRAIL_SAMPLE_DIST) {
      currentTrail.points.push({ x: cursor.x, y: cursor.y, ox: cursor.x, oy: cursor.y });
    }
  }
}

function moveCursor(dx, dy) {
  cursor.x = Math.max(20, Math.min(W - 20, cursor.x + dx));
  cursor.y = Math.max(20, Math.min(H - 20, cursor.y + dy));
  updateCursorEl();
}

function drawConstellation(t, dt) {
  const speed = M.speed;

  // Organic drift — slowly shift all points using noise
  driftField.offsetX += dt * 0.00003 * speed;
  driftField.offsetY += dt * 0.00003 * speed;

  // Update continuous cursor movement
  const moveAmount = cursor.speed * (dt / 16);
  if (cursorKeys.left) moveCursor(-moveAmount, 0);
  if (cursorKeys.right) moveCursor(moveAmount, 0);
  if (cursorKeys.up) moveCursor(0, -moveAmount);
  if (cursorKeys.down) moveCursor(0, moveAmount);

  // Update paint hold state
  paintUpdate();

  // Update point positions with drift
  for (let i = 0; i < constellationPoints.length; i++) {
    const p = constellationPoints[i];
    const nx = noise2D(p.ox * 0.002 + driftField.offsetX, p.oy * 0.002) * 30;
    const ny = noise2D(p.oy * 0.002, p.ox * 0.002 + driftField.offsetY) * 30;
    p.x = p.ox + nx;
    p.y = p.oy + ny;
  }

  // Update trail point positions with drift
  for (let i = 0; i < paintTrails.length; i++) {
    const trail = paintTrails[i];
    for (let j = 0; j < trail.points.length; j++) {
      const p = trail.points[j];
      const nx = noise2D(p.ox * 0.002 + driftField.offsetX, p.oy * 0.002) * 20;
      const ny = noise2D(p.oy * 0.002, p.ox * 0.002 + driftField.offsetY) * 20;
      p.x = p.ox + nx;
      p.y = p.oy + ny;
    }
  }

  ctx.globalCompositeOperation = 'screen';

  // ── Draw paint trails ──
  for (let i = 0; i < paintTrails.length; i++) {
    const trail = paintTrails[i];
    const pts = trail.points;
    if (pts.length < 2) continue;

    const c = _rcColors[trail.ci];
    const age = t - trail.birth;
    const breath = 0.5 + 0.3 * Math.sin(t * 0.0015 + trail.phase);

    // Draw glow pass (wider, more transparent)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) {
      // Smooth curve through points
      if (j < pts.length - 1) {
        const mx = (pts[j].x + pts[j + 1].x) / 2;
        const my = (pts[j].y + pts[j + 1].y) / 2;
        ctx.quadraticCurveTo(pts[j].x, pts[j].y, mx, my);
      } else {
        ctx.lineTo(pts[j].x, pts[j].y);
      }
    }
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${breath * 0.08})`;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw core pass (thinner, brighter)
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let j = 1; j < pts.length; j++) {
      if (j < pts.length - 1) {
        const mx = (pts[j].x + pts[j + 1].x) / 2;
        const my = (pts[j].y + pts[j + 1].y) / 2;
        ctx.quadraticCurveTo(pts[j].x, pts[j].y, mx, my);
      } else {
        ctx.lineTo(pts[j].x, pts[j].y);
      }
    }
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${breath * 0.25})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  // ── Draw constellation lines ──
  for (let i = 0; i < constellationLines.length; i++) {
    const line = constellationLines[i];
    const age = t - line.birth;
    line.growProgress = Math.min(1, age / 600);

    const a = constellationPoints[line.a];
    const b = constellationPoints[line.b];
    if (!a || !b) continue;

    const ca = _rcColors[a.ci];
    const cb = _rcColors[b.ci];

    const ex = a.x + (b.x - a.x) * line.growProgress;
    const ey = a.y + (b.y - a.y) * line.growProgress;

    const pulse = 0.15 + 0.1 * Math.sin(t * 0.001 + i);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(ex, ey);

    const grad = ctx.createLinearGradient(a.x, a.y, ex, ey);
    grad.addColorStop(0, `rgba(${ca[0]},${ca[1]},${ca[2]},${pulse})`);
    grad.addColorStop(1, `rgba(${cb[0]},${cb[1]},${cb[2]},${pulse * 0.6})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // ── Draw points ──
  for (let i = 0; i < constellationPoints.length; i++) {
    const p = constellationPoints[i];
    const c = _rcColors[p.ci];
    const age = t - p.birth;

    const spawnScale = Math.min(1, age / 300);
    const sz = p.size * spawnScale;

    const breath = 0.6 + 0.4 * Math.sin(t * 0.002 + p.phase);

    // Glow
    const glowR = sz * 6;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${breath * 0.3})`);
    grad.addColorStop(0.4, `rgba(${c[0]},${c[1]},${c[2]},${breath * 0.1})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, glowR, 0, TWO_PI);
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(p.x, p.y, sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${breath * 0.9})`;
    ctx.fill();
  }

  // ── Cursor glow ──
  if (cursorEl) {
    const pc = _rcParticle;
    const glowSize = isPainting ? 60 : 40;
    const glowAlpha = isPainting ? 0.15 : 0.08;
    const grad = ctx.createRadialGradient(cursor.x, cursor.y, 0, cursor.x, cursor.y, glowSize);
    grad.addColorStop(0, `rgba(${pc[0]},${pc[1]},${pc[2]},${glowAlpha})`);
    grad.addColorStop(1, `rgba(${pc[0]},${pc[1]},${pc[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, glowSize, 0, TWO_PI);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
}
