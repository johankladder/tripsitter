// Threads — luminous string art loom with orbiting anchor points
let anchors = [];
let threadCache = [];
let threadPulses = [];

const ANCHOR_COUNT = 24;
const MAX_THREAD_DIST = 220;
const PULSE_CHANCE = 0.0004;

function initThreads() {
  anchors = [];
  threadCache = [];
  threadPulses = [];

  const cx = W / 2, cy = H / 2;

  for (let i = 0; i < ANCHOR_COUNT; i++) {
    const layer = Math.floor(i / 8); // 3 orbital layers
    const baseRadius = Math.min(W, H) * (0.12 + layer * 0.14);
    const radiusVar = baseRadius * (0.8 + Math.random() * 0.4);
    const angleOffset = (i / 8) * TWO_PI + layer * 1.2;
    const speed = (0.00006 + Math.random() * 0.00004) * (layer % 2 === 0 ? 1 : -1);

    // Elliptical orbit parameters
    const rx = radiusVar * (0.7 + Math.random() * 0.6);
    const ry = radiusVar * (0.7 + Math.random() * 0.6);
    const tilt = Math.random() * Math.PI * 0.3;

    anchors.push({
      cx: cx + (Math.random() - 0.5) * W * 0.1,
      cy: cy + (Math.random() - 0.5) * H * 0.1,
      rx: rx,
      ry: ry,
      tilt: tilt,
      angle: angleOffset,
      speed: speed,
      wobblePhase: Math.random() * TWO_PI,
      wobbleSpeed: 0.0003 + Math.random() * 0.0002,
      wobbleAmp: 15 + Math.random() * 25,
      ci: i % 6,
      x: 0, y: 0,
      sz: 1.5 + Math.random() * 2
    });
  }
}

function drawThreads(t, dt) {
  const cx = W / 2, cy = H / 2;

  // ── UPDATE ANCHOR POSITIONS ──
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    a.angle += a.speed * dt * M.speed;

    // Elliptical orbit with tilt
    const cosT = Math.cos(a.tilt);
    const sinT = Math.sin(a.tilt);
    const ox = Math.cos(a.angle) * a.rx;
    const oy = Math.sin(a.angle) * a.ry;
    const baseX = a.cx + ox * cosT - oy * sinT;
    const baseY = a.cy + ox * sinT + oy * cosT;

    // Noise-driven wobble for organic feel
    const wobX = Math.sin(t * a.wobbleSpeed + a.wobblePhase) * a.wobbleAmp;
    const wobY = Math.cos(t * a.wobbleSpeed * 0.7 + a.wobblePhase + 2) * a.wobbleAmp;

    a.x = baseX + wobX;
    a.y = baseY + wobY;
  }

  // ── FIND THREAD PAIRS ── (squared distance check, only sqrt for kept pairs)
  threadCache.length = 0;
  const maxDistSq = MAX_THREAD_DIST * MAX_THREAD_DIST;
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      const a = anchors[i], b = anchors[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < maxDistSq && distSq > 100) {
        threadCache.push({ i, j, dist: Math.sqrt(distSq) });
      }
    }
  }

  // ── SPAWN PULSES ──
  if (Math.random() < PULSE_CHANCE * dt * M.speed && threadCache.length > 0) {
    const thread = threadCache[Math.floor(Math.random() * threadCache.length)];
    threadPulses.push({
      from: thread.i,
      to: thread.j,
      progress: 0,
      speed: 0.0006 + Math.random() * 0.0004,
      ci: anchors[thread.i].ci
    });
  }

  // ── UPDATE PULSES ──
  for (let i = threadPulses.length - 1; i >= 0; i--) {
    threadPulses[i].progress += threadPulses[i].speed * dt * M.speed;
    if (threadPulses[i].progress > 1) threadPulses.splice(i, 1);
  }

  // ── DRAW THREADS ──
  for (let t2 = 0; t2 < threadCache.length; t2++) {
    const thread = threadCache[t2];
    const a = anchors[thread.i], b = anchors[thread.j];
    const proximity = 1 - thread.dist / MAX_THREAD_DIST;

    // Blend colors from both anchors
    const c1 = _rcColors[a.ci];
    const c2 = _rcColors[b.ci];
    const r = (c1[0] + c2[0]) >> 1;
    const g = (c1[1] + c2[1]) >> 1;
    const bl = (c1[2] + c2[2]) >> 1;

    const alpha = proximity * proximity * (0.04 + 0.02 * Math.sin(t * 0.0004 + thread.i + thread.j));

    // Catenary sag — thread droops based on distance
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const sag = thread.dist * 0.08 * Math.sin(t * 0.0002 + thread.i * 0.5);
    const perpX = -(b.y - a.y) / thread.dist;
    const perpY = (b.x - a.x) / thread.dist;
    const cpx = mx + perpX * sag;
    const cpy = my + perpY * sag;

    // Main thread
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cpx, cpy, b.x, b.y);
    ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Glow thread
    ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha * 0.4})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // ── DRAW PULSES ON THREADS ──
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < threadPulses.length; i++) {
    const p = threadPulses[i];
    const a = anchors[p.from], b = anchors[p.to];
    if (!a || !b) continue;

    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;

    // Pulse position along catenary
    const sag = dist * 0.08 * Math.sin(t * 0.0002 + p.from * 0.5);
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const mx = (a.x + b.x) / 2 + perpX * sag;
    const my = (a.y + b.y) / 2 + perpY * sag;

    const pt = p.progress;
    const px = (1 - pt) * (1 - pt) * a.x + 2 * (1 - pt) * pt * mx + pt * pt * b.x;
    const py = (1 - pt) * (1 - pt) * a.y + 2 * (1 - pt) * pt * my + pt * pt * b.y;

    const c = _rcColors[p.ci];
    const intensity = Math.sin(pt * Math.PI);

    const grad = ctx.createRadialGradient(px, py, 0, px, py, 10);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${intensity * 0.4})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, TWO_PI);
    ctx.fill();
  }

  // ── DRAW ANCHORS ──
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const c = _rcColors[a.ci];
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.0015 + a.wobblePhase);
    const brightness = 0.12 * pulse;

    // Glow
    const glowR = a.sz * 6;
    const grad = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, glowR);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${brightness})`);
    grad.addColorStop(0.4, `rgba(${c[0]},${c[1]},${c[2]},${brightness * 0.3})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(a.x, a.y, glowR, 0, TWO_PI);
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${brightness * 2})`;
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // ── AMBIENT DUST ──
  const pc = _rcParticle;
  for (let i = 0; i < 20; i++) {
    const angle = t * 0.00003 * M.speed + i * 0.314;
    const dist2 = Math.min(W, H) * (0.15 + 0.35 * Math.sin(t * 0.0001 + i * 1.7));
    const px = cx + Math.cos(angle) * dist2;
    const py = cy + Math.sin(angle) * dist2;
    const op = 0.08 + 0.06 * Math.sin(t * 0.001 + i * 2.3);
    ctx.beginPath();
    ctx.arc(px, py, 0.8, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`;
    ctx.fill();
  }
}

SCENES.threads = { init: initThreads, draw: drawThreads };
