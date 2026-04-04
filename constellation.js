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

  // Hide ambient UI controls
  const controls = document.querySelector('.controls');
  if (controls) controls.style.display = 'none';
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
    ox: cursor.x, // original position for drift reference
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

  // Update point positions with drift
  for (let i = 0; i < constellationPoints.length; i++) {
    const p = constellationPoints[i];
    const nx = noise2D(p.ox * 0.002 + driftField.offsetX, p.oy * 0.002) * 30;
    const ny = noise2D(p.oy * 0.002, p.ox * 0.002 + driftField.offsetY) * 30;
    p.x = p.ox + nx;
    p.y = p.oy + ny;
  }

  ctx.globalCompositeOperation = 'screen';

  // Draw lines — grow in from birth
  for (let i = 0; i < constellationLines.length; i++) {
    const line = constellationLines[i];
    const age = t - line.birth;
    line.growProgress = Math.min(1, age / 600);

    const a = constellationPoints[line.a];
    const b = constellationPoints[line.b];
    if (!a || !b) continue;

    const ca = _rcColors[a.ci];
    const cb = _rcColors[b.ci];

    // Interpolated end point for growth animation
    const ex = a.x + (b.x - a.x) * line.growProgress;
    const ey = a.y + (b.y - a.y) * line.growProgress;

    // Pulsing opacity
    const pulse = 0.15 + 0.1 * Math.sin(t * 0.001 + i);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(ex, ey);

    const grad = ctx.createLinearGradient(a.x, a.y, ex, ey);
    grad.addColorStop(0, `rgba(${ca[0]},${ca[1]},${ca[2]},${pulse})`);
    grad.addColorStop(1, `rgba(${cb[0]},${cb[1]},${cb[2]},${pulse * 0.6})`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Draw points
  for (let i = 0; i < constellationPoints.length; i++) {
    const p = constellationPoints[i];
    const c = _rcColors[p.ci];
    const age = t - p.birth;

    // Spawn scale animation
    const spawnScale = Math.min(1, age / 300);
    const sz = p.size * spawnScale;

    // Breathing
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

  // Draw faint cursor trail glow on canvas
  if (cursorEl) {
    const pc = _rcParticle;
    const grad = ctx.createRadialGradient(cursor.x, cursor.y, 0, cursor.x, cursor.y, 40);
    grad.addColorStop(0, `rgba(${pc[0]},${pc[1]},${pc[2]},0.08)`);
    grad.addColorStop(1, `rgba(${pc[0]},${pc[1]},${pc[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cursor.x, cursor.y, 40, 0, TWO_PI);
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
}
