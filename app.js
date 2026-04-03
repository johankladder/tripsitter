// ══════════════════════════════════════════════════════
// MOODS (color palettes)
// ══════════════════════════════════════════════════════
const TWO_PI = Math.PI * 2;

const MOODS = {
  ocean: {
    bg: [5, 8, 25],
    colors: [[40,100,160],[70,160,180],[20,60,120],[100,180,200],[30,80,140],[60,140,170]],
    particleColor: [140, 200, 230], speed: 0.6,
  },
  aurora: {
    bg: [8, 12, 20],
    colors: [[60,200,140],[40,100,180],[80,230,160],[50,140,200],[100,220,180],[30,80,150]],
    particleColor: [160, 240, 200], speed: 0.5,
  },
  ember: {
    bg: [20, 8, 5],
    colors: [[200,120,50],[180,70,40],[220,160,60],[160,60,40],[230,140,70],[140,50,30]],
    particleColor: [255, 200, 140], speed: 0.45,
  },
  dream: {
    bg: [12, 5, 20],
    colors: [[160,100,220],[100,60,180],[200,140,240],[80,50,160],[180,120,230],[120,70,200]],
    particleColor: [210, 170, 255], speed: 0.5,
  },
  forest: {
    bg: [5, 15, 10],
    colors: [[60,160,80],[40,120,70],[80,180,100],[30,100,60],[100,200,120],[50,140,80]],
    particleColor: [150, 220, 170], speed: 0.4,
  },
  sunset: {
    bg: [20, 8, 12],
    colors: [[220,100,60],[240,160,80],[200,60,80],[255,180,100],[180,50,70],[230,130,50]],
    particleColor: [255, 180, 120], speed: 0.5,
  },
  ice: {
    bg: [8, 12, 20],
    colors: [[140,200,240],[100,170,220],[180,220,250],[80,150,200],[160,210,245],[120,180,230]],
    particleColor: [200, 230, 255], speed: 0.35,
  },
  neon: {
    bg: [5, 5, 15],
    colors: [[255,50,150],[50,200,255],[255,200,50],[150,50,255],[50,255,150],[255,100,50]],
    particleColor: [255, 150, 255], speed: 0.65,
  },
  midnight: {
    bg: [3, 3, 10],
    colors: [[30,40,100],[20,30,80],[50,60,130],[15,20,70],[40,50,120],[25,35,90]],
    particleColor: [100, 120, 200], speed: 0.3,
  },
  rose: {
    bg: [18, 6, 12],
    colors: [[200,80,120],[180,60,100],[220,120,160],[160,50,90],[230,140,170],[170,70,110]],
    particleColor: [240, 170, 200], speed: 0.45,
  }
};

let currentMood = 'ocean';
let targetMood = MOODS.ocean;
const M = {
  bg: [...MOODS.ocean.bg],
  colors: MOODS.ocean.colors.map(c => [...c]),
  particleColor: [...MOODS.ocean.particleColor],
  speed: MOODS.ocean.speed
};

function lerpC(a, b, t) {
  a[0] += (b[0] - a[0]) * t;
  a[1] += (b[1] - a[1]) * t;
  a[2] += (b[2] - a[2]) * t;
  return a;
}

// Pre-allocated arrays for rounded color values — avoids .map(Math.round) allocations in hot loops
const _rc = [0, 0, 0];
const _rcColors = Array.from({ length: 6 }, () => [0, 0, 0]);
const _rcParticle = [0, 0, 0];

function cacheRoundedColors() {
  for (let i = 0; i < 6; i++) {
    _rcColors[i][0] = M.colors[i][0] | 0;
    _rcColors[i][1] = M.colors[i][1] | 0;
    _rcColors[i][2] = M.colors[i][2] | 0;
  }
  _rcParticle[0] = M.particleColor[0] | 0;
  _rcParticle[1] = M.particleColor[1] | 0;
  _rcParticle[2] = M.particleColor[2] | 0;
}

function updateMoodLerp() {
  const s = 0.018;
  M.bg = lerpC(M.bg, targetMood.bg, s);
  M.particleColor = lerpC(M.particleColor, targetMood.particleColor, s);
  for (let i = 0; i < 6; i++) M.colors[i] = lerpC(M.colors[i], targetMood.colors[i], s);
  M.speed += (targetMood.speed - M.speed) * s;
}


// ══════════════════════════════════════════════════════
// CANVAS
// ══════════════════════════════════════════════════════
const canvas = document.getElementById('main');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  const dpr = window._castReceiver ? 1 : (devicePixelRatio || 1);
  W = canvas.width = window.innerWidth * dpr;
  H = canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}
resize();
window.addEventListener('resize', () => {
  canvas.width = 0;
  resize();
  initCurrentScene();
});

// ══════════════════════════════════════════════════════
// SIMPLEX-LIKE NOISE
// ══════════════════════════════════════════════════════
const perm = new Uint8Array(512);
const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];
(function () {
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function noise2D(x, y) {
  const s = (x + y) * F2;
  let i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2;
  const X0 = i - t, Y0 = j - t;
  const x0 = x - X0, y0 = y - Y0;
  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  i &= 255; j &= 255;
  const gi0 = perm[i + perm[j]] % 12;
  const gi1 = perm[i + i1 + perm[j + j1]] % 12;
  const gi2 = perm[i + 1 + perm[j + 1]] % 12;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0); }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1); }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2); }
  return 70 * (n0 + n1 + n2);
}

// ══════════════════════════════════════════════════════
// SCENE 1: DEEP OCEAN
// ══════════════════════════════════════════════════════
let deepBlobs = [], deepParticles = [], deepFlows = [];

function initDeep() {
  deepBlobs = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * TWO_PI;
    const dist = Math.random() * 0.25 + 0.15;
    return {
      x: W * (0.5 + Math.cos(angle) * dist),
      y: H * (0.5 + Math.sin(angle) * dist),
      baseR: Math.min(W, H) * (Math.random() * 0.18 + 0.12),
      nOff: Math.random() * 1000,
      sx: (Math.random() - 0.5) * 0.15,
      sy: (Math.random() - 0.5) * 0.15,
      ci: i % 6,
      phase: Math.random() * TWO_PI,
      ws: 0.0004 + Math.random() * 0.0003,
      pts: 7 + Math.floor(Math.random() * 4)
    };
  });

  deepParticles = Array.from({ length: 120 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    sz: Math.random() * 2.5 + 0.5,
    sx: (Math.random() - 0.5) * 0.2,
    sy: -(Math.random() * 0.3 + 0.05),
    op: 0, mop: Math.random() * 0.5 + 0.15,
    life: 0, ml: Math.random() * 12000 + 6000,
    fs: Math.random() * 0.003 + 0.001,
    drift: Math.random() * TWO_PI
  }));

  deepFlows = Array.from({ length: 6 }, () => createFlow());
}

function createFlow() {
  const sx = Math.random() * W, sy = Math.random() * H;
  const a = Math.random() * TWO_PI;
  const segs = 60 + Math.floor(Math.random() * 40);
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const d = Math.sin(t * Math.PI * 3 + a) * 80;
    pts.push({
      x: sx + Math.cos(a) * i * 4 + Math.cos(a + Math.PI / 2) * d,
      y: sy + Math.sin(a) * i * 4 + Math.sin(a + Math.PI / 2) * d
    });
  }
  return { pts, life: 0, ml: 15000 + Math.random() * 10000, ci: Math.floor(Math.random() * 6) };
}

function drawDeep(t, dt) {
  // Flow lines
  deepFlows.forEach(fl => {
    fl.life += dt;
    if (fl.life > fl.ml) Object.assign(fl, createFlow());
    const lr = fl.life / fl.ml;
    let al = lr < 0.2 ? lr / 0.2 : lr > 0.7 ? 1 - (lr - 0.7) / 0.3 : 1;
    al *= 0.04;
    const [r, g, b] = M.colors[fl.ci];
    ctx.beginPath();
    ctx.moveTo(fl.pts[0].x, fl.pts[0].y);
    for (let i = 1; i < fl.pts.length - 1; i++) {
      const xc = (fl.pts[i].x + fl.pts[i + 1].x) / 2;
      const yc = (fl.pts[i].y + fl.pts[i + 1].y) / 2;
      const ox = Math.sin(t * 0.0003 + i * 0.5) * 3;
      const oy = Math.cos(t * 0.00025 + i * 0.5) * 3;
      ctx.quadraticCurveTo(fl.pts[i].x + ox, fl.pts[i].y + oy, xc + ox, yc + oy);
    }
    ctx.strokeStyle = `rgba(${r},${g},${b},${al})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Blobs
  ctx.globalCompositeOperation = 'screen';
  deepBlobs.forEach(bl => {
    const s = M.speed * 0.7;
    bl.x += bl.sx * s + Math.sin(t * 0.0002 + bl.nOff) * 0.12 * s;
    bl.y += bl.sy * s + Math.cos(t * 0.00018 + bl.nOff) * 0.12 * s;
    const mg = bl.baseR * 2;
    if (bl.x < -mg) bl.x = W + mg;
    if (bl.x > W + mg) bl.x = -mg;
    if (bl.y < -mg) bl.y = H + mg;
    if (bl.y > H + mg) bl.y = -mg;

    const radius = bl.baseR * (1 + 0.15 * Math.sin(t * bl.ws + bl.phase));
    const pts = [];
    for (let i = 0; i < bl.pts; i++) {
      const a = (i / bl.pts) * TWO_PI;
      const w = Math.sin(t * 0.0006 + bl.nOff + i * 1.7) * 0.25 + 1;
      pts.push({ x: bl.x + Math.cos(a) * radius * w, y: bl.y + Math.sin(a) * radius * w });
    }
    ctx.beginPath();
    ctx.moveTo((pts[pts.length - 1].x + pts[0].x) / 2, (pts[pts.length - 1].y + pts[0].y) / 2);
    for (let i = 0; i < pts.length; i++) {
      const n = pts[(i + 1) % pts.length];
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + n.x) / 2, (pts[i].y + n.y) / 2);
    }
    ctx.closePath();
    const [r, g, b] = M.colors[bl.ci];
    const grad = ctx.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, radius * 1.4);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.18)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},0.08)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';

  // Particles
  deepParticles.forEach(p => {
    p.life += dt;
    const lr = p.life / p.ml;
    p.op = lr < 0.15 ? p.mop * (lr / 0.15) : lr > 0.8 ? p.mop * (1 - (lr - 0.8) / 0.2) : p.mop;
    p.op *= 0.7 + 0.3 * Math.sin(p.life * p.fs);
    p.drift += 0.001 * M.speed;
    p.x += (p.sx + Math.sin(p.drift) * 0.15) * M.speed;
    p.y += p.sy * M.speed;
    if (p.life > p.ml) { p.x = Math.random() * W; p.y = H + 20; p.life = 0; }
    const [r, g, b] = _rcParticle;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${r},${g},${b},${p.op})`; ctx.fill();
    if (p.sz > 1.5) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * 4, 0, TWO_PI);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.op * 0.1})`; ctx.fill();
    }
  });
}

// ══════════════════════════════════════════════════════
// SCENE 2: MANDALA
// ══════════════════════════════════════════════════════
function drawMandala(t) {
  const cx = W / 2, cy = H / 2;
  const maxR = Math.min(W, H) * 0.42;
  const breathScale = 1 + 0.06 * Math.sin(t * 0.0004);

  for (let layer = 0; layer < 5; layer++) {
    const petals = 6 + layer * 2;
    const ringR = maxR * (0.25 + layer * 0.18) * breathScale;
    const rot = t * (0.00008 + layer * 0.00003) * (layer % 2 === 0 ? 1 : -1);
    const petalR = ringR * (0.35 - layer * 0.03);
    const c = _rcColors[layer % 6];
    const alpha = 0.06 + 0.02 * Math.sin(t * 0.0003 + layer);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * TWO_PI;
      const px = Math.cos(a) * ringR;
      const py = Math.sin(a) * ringR;
      const wobble = 1 + 0.15 * Math.sin(t * 0.0005 + i * 2.3 + layer);

      ctx.beginPath();
      ctx.ellipse(px, py, petalR * wobble, petalR * wobble * 0.5, a, 0, TWO_PI);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, petalR * wobble);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 1.5})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      const nextA = ((i + 1) / petals) * TWO_PI;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(Math.cos(nextA) * ringR, Math.sin(nextA) * ringR);
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Center glow
  const cc = _rcColors[0];
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3 * breathScale);
  cGrad.addColorStop(0, `rgba(${cc[0]},${cc[1]},${cc[2]},0.12)`);
  cGrad.addColorStop(1, `rgba(${cc[0]},${cc[1]},${cc[2]},0)`);
  ctx.fillStyle = cGrad;
  ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.3 * breathScale, 0, TWO_PI); ctx.fill();

  // Outer rings
  for (let r = 0; r < 3; r++) {
    const rr = maxR * (0.9 + r * 0.08) * breathScale;
    const pulse = 0.03 + 0.02 * Math.sin(t * 0.0006 + r);
    const rc = _rcColors[(r + 3) % 6];
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TWO_PI);
    ctx.strokeStyle = `rgba(${rc[0]},${rc[1]},${rc[2]},${pulse})`;
    ctx.lineWidth = 1; ctx.stroke();
  }

  // Floating dots
  for (let i = 0; i < 40; i++) {
    const a = t * 0.0001 + i * 0.157;
    const dist = maxR * (0.5 + 0.5 * Math.sin(t * 0.0002 + i * 0.7)) * breathScale;
    const px = cx + Math.cos(a) * dist, py = cy + Math.sin(a) * dist;
    const sz = 1 + Math.sin(t * 0.001 + i) * 0.8;
    const op = 0.15 + 0.1 * Math.sin(t * 0.0008 + i * 1.3);
    const pc = _rcParticle;
    ctx.beginPath(); ctx.arc(px, py, sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`; ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE 3: COSMOS
// ══════════════════════════════════════════════════════
let stars = [], shootingStars = [];

function initCosmos() {
  stars = Array.from({ length: 300 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    sz: Math.random() * 1.8 + 0.2,
    twinkle: Math.random() * 0.005 + 0.001,
    phase: Math.random() * TWO_PI,
    brightness: Math.random() * 0.6 + 0.2
  }));
  shootingStars = [];
}

function drawCosmos(t, dt) {
  // Nebula clouds — larger step on Cast receiver for performance
  const step = window._castReceiver ? 12 : 6;
  for (let x = 0; x < W; x += step) {
    for (let y = 0; y < H; y += step) {
      const n1 = noise2D(x * 0.002 + t * 0.00003, y * 0.002) * 0.5 + 0.5;
      const n2 = noise2D(x * 0.004 + 100 + t * 0.00002, y * 0.004 + 100) * 0.5 + 0.5;
      const n3 = noise2D(x * 0.001 - t * 0.00004, y * 0.001 + 200) * 0.5 + 0.5;
      const ci = Math.floor(n1 * 3);
      const ci2 = Math.floor(n2 * 3) + 3;
      const c1 = M.colors[ci % 6], c2 = M.colors[ci2 % 6];
      const blend = n2;
      const r = c1[0] * (1 - blend) + c2[0] * blend;
      const g = c1[1] * (1 - blend) + c2[1] * blend;
      const b = c1[2] * (1 - blend) + c2[2] * blend;
      const alpha = n3 * n1 * 0.12;
      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
      ctx.fillRect(x, y, step + 1, step + 1);
    }
  }

  // Stars
  const pc = _rcParticle;
  stars.forEach(s => {
    const brightness = s.brightness * (0.6 + 0.4 * Math.sin(t * s.twinkle + s.phase));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${brightness})`; ctx.fill();
    if (s.sz > 1.2) {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * 3, 0, TWO_PI);
      ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${brightness * 0.08})`; ctx.fill();
    }
  });

  // Shooting stars
  if (Math.random() < 0.003) {
    shootingStars.push({
      x: Math.random() * W, y: Math.random() * H * 0.5,
      vx: 3 + Math.random() * 3, vy: 1 + Math.random() * 2,
      life: 0, ml: 800 + Math.random() * 600, len: 40 + Math.random() * 60
    });
  }
  shootingStars.forEach(s => {
    s.life += dt; s.x += s.vx * M.speed; s.y += s.vy * M.speed;
    const alpha = s.life < 100 ? s.life / 100 : s.life > s.ml - 200 ? (s.ml - s.life) / 200 : 1;
    const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * s.len / 4, s.y - s.vy * s.len / 4);
    grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.8})`);
    grad.addColorStop(1, `rgba(${pc[0]},${pc[1]},${pc[2]},0)`);
    ctx.beginPath(); ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * s.len / 4, s.y - s.vy * s.len / 4);
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();
  });
  shootingStars = shootingStars.filter(s => s.life < s.ml);
}

// ══════════════════════════════════════════════════════
// SCENE 4: LIQUID (metaball lava lamp)
// ══════════════════════════════════════════════════════
let metaballs = [];

function initLiquid() {
  metaballs = Array.from({ length: 10 }, (_, i) => ({
    x: W * 0.3 + Math.random() * W * 0.4,
    y: H * 0.2 + Math.random() * H * 0.6,
    r: Math.min(W, H) * (0.06 + Math.random() * 0.08),
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.3,
    phase: Math.random() * TWO_PI,
    ci: i % 6,
    currentR: 0
  }));
}

function drawLiquid(t, dt) {
  metaballs.forEach(mb => {
    mb.vy += Math.sin(t * 0.0003 + mb.phase) * 0.002;
    mb.x += mb.vx * M.speed;
    mb.y += mb.vy * M.speed;
    if (mb.x < mb.r) { mb.x = mb.r; mb.vx *= -0.8; }
    if (mb.x > W - mb.r) { mb.x = W - mb.r; mb.vx *= -0.8; }
    if (mb.y < mb.r) { mb.y = mb.r; mb.vy *= -0.8; }
    if (mb.y > H - mb.r) { mb.y = H - mb.r; mb.vy *= -0.8; }
    mb.currentR = mb.r * (1 + 0.2 * Math.sin(t * 0.0005 + mb.phase));
  });

  ctx.globalCompositeOperation = 'screen';
  for (let pass = 0; pass < 3; pass++) {
    const scale = 1 + pass * 0.6;
    const alpha = [0.15, 0.06, 0.025][pass];
    metaballs.forEach(mb => {
      const c = _rcColors[mb.ci];
      const grad = ctx.createRadialGradient(mb.x, mb.y, 0, mb.x, mb.y, mb.currentR * scale);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
      grad.addColorStop(0.6, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(mb.x, mb.y, mb.currentR * scale, 0, TWO_PI); ctx.fill();
    });
  }

  // Bridges between close metaballs
  for (let i = 0; i < metaballs.length; i++) {
    for (let j = i + 1; j < metaballs.length; j++) {
      const a = metaballs[i], b = metaballs[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = (a.currentR + b.currentR) * 2;
      if (dist < threshold) {
        const strength = 1 - dist / threshold;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const mr = (a.currentR + b.currentR) * 0.4 * strength;
        const c = _rcColors[a.ci];
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
        grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.08 * strength})`);
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, TWO_PI); ctx.fill();
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // Rising particles
  for (let i = 0; i < 30; i++) {
    const px = W * 0.2 + noise2D(i * 3.7, t * 0.0001) * W * 0.6;
    const py = (H + 50 - ((t * 0.02 * M.speed + i * H / 30 * 1.3) % (H + 100)));
    const sz = 1 + Math.sin(t * 0.001 + i) * 0.5;
    const op = 0.15 + 0.1 * Math.sin(t * 0.0005 + i * 1.9);
    const pc = _rcParticle;
    ctx.beginPath(); ctx.arc(px, py, sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`; ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE 5: WAVES
// ══════════════════════════════════════════════════════
function drawWaves(t) {
  const layers = 8;

  for (let l = 0; l < layers; l++) {
    const yBase = H * (0.25 + l * 0.08);
    const c = _rcColors[l % 6];
    const amplitude = 30 + l * 12 + 20 * Math.sin(t * 0.0002 + l);
    const freq = 0.003 - l * 0.0002;
    const speed = t * (0.0003 + l * 0.00005) * (l % 2 === 0 ? 1 : -1);
    const alpha = 0.04 + 0.02 * Math.sin(t * 0.0003 + l * 1.1);

    // Compute wave points once, reuse for fill and stroke
    const noiseY = l * 10 + t * 0.00005;
    const sinOffset = t * 0.0004 + l;
    const waveYs = [];
    for (let x = 0; x <= W; x += 3) {
      const n = noise2D(x * freq + speed, noiseY);
      waveYs.push(yBase + n * amplitude + Math.sin(x * 0.01 + sinOffset) * amplitude * 0.3);
    }

    // Fill below wave
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let j = 0, x = 0; x <= W; x += 3, j++) ctx.lineTo(x, waveYs[j]);
    ctx.lineTo(W, H); ctx.closePath();
    const grad = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude + H * 0.3);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
    grad.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad; ctx.fill();

    // Wave line
    ctx.beginPath();
    for (let j = 0, x = 0; x <= W; x += 3, j++) {
      x === 0 ? ctx.moveTo(x, waveYs[j]) : ctx.lineTo(x, waveYs[j]);
    }
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * 2})`;
    ctx.lineWidth = 1; ctx.stroke();
  }

  // Foam sparkles
  const pc = _rcParticle;
  for (let i = 0; i < 50; i++) {
    const x = (t * 0.03 * M.speed + i * W / 50) % W;
    const l = i % layers;
    const yBase = H * (0.25 + l * 0.08);
    const freq = 0.003 - l * 0.0002;
    const speed = t * (0.0003 + l * 0.00005) * (l % 2 === 0 ? 1 : -1);
    const n = noise2D(x * freq + speed, l * 10 + t * 0.00005);
    const amplitude = 30 + l * 12 + 20 * Math.sin(t * 0.0002 + l);
    const y = yBase + n * amplitude + Math.sin(x * 0.01 + t * 0.0004 + l) * amplitude * 0.3;
    const op = 0.1 + 0.15 * Math.sin(t * 0.002 + i * 2.1);
    ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`; ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE 6: KALEIDOSCOPE
// ══════════════════════════════════════════════════════
function drawKaleido(t) {
  const cx = W / 2, cy = H / 2;
  const segments = 8;
  const segAngle = TWO_PI / segments;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  ctx.save();
  ctx.translate(cx, cy);

  for (let seg = 0; seg < segments; seg++) {
    ctx.save();
    ctx.rotate(seg * segAngle);
    if (seg % 2 === 1) ctx.scale(1, -1);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(maxR, 0);
    ctx.arc(0, 0, maxR, 0, segAngle / 2);
    ctx.lineTo(0, 0);
    ctx.clip();

    // Evolving shapes
    for (let i = 0; i < 12; i++) {
      const dist = maxR * (0.1 + i * 0.08);
      const angle = segAngle * 0.25 + Math.sin(t * 0.0003 + i * 0.8) * segAngle * 0.15;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      const sz = (20 + i * 8) * (1 + 0.3 * Math.sin(t * 0.0004 + i * 1.5));
      const c = _rcColors[i % 6];
      const alpha = 0.06 + 0.03 * Math.sin(t * 0.0005 + i * 2);

      ctx.beginPath();
      const sides = 3 + Math.floor(Math.sin(t * 0.0001 + i) * 1.5 + 1.5);
      for (let s = 0; s <= sides; s++) {
        const sa = (s / sides) * TWO_PI + t * 0.0002;
        const sr = sz * (1 + 0.3 * Math.sin(t * 0.0006 + s * 1.7 + i));
        const sx = px + Math.cos(sa) * sr;
        const sy = py + Math.sin(sa) * sr;
        s === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      const grad = ctx.createRadialGradient(px, py, 0, px, py, sz * 1.5);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = grad; ctx.fill();
    }

    // Flowing lines
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let x = 0; x < maxR; x += 4) {
        const y = Math.sin(x * 0.008 + t * 0.0003 + i * 1.5) * 30 * (1 + x / maxR)
          + noise2D(x * 0.005 + t * 0.0001, i * 5) * 20;
        x === 0 ? ctx.moveTo(x, y + segAngle * x * 0.1) : ctx.lineTo(x, y + segAngle * x * 0.1);
      }
      const c = _rcColors[(i + 2) % 6];
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.04)`;
      ctx.lineWidth = 1.5; ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();

  // Center jewel
  const breathe = 1 + 0.1 * Math.sin(t * 0.0004);
  for (let r = 3; r >= 0; r--) {
    const rr = 20 + r * 15 * breathe;
    const c = _rcColors[r % 6];
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.15 - r * 0.03})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TWO_PI); ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE 7: FIREFLIES
// ══════════════════════════════════════════════════════
let fireflies = [];

function initFireflies() {
  fireflies = Array.from({ length: 60 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    sz: Math.random() * 3 + 1,
    phase: Math.random() * TWO_PI,
    pulseSpeed: 0.002 + Math.random() * 0.003,
    flashTimer: Math.random() * 8000,
    flashInterval: 5000 + Math.random() * 10000,
    ci: Math.floor(Math.random() * 6),
    drift: Math.random() * TWO_PI
  }));
}

function drawFireflies(t, dt) {
  // Fireflies
  ctx.globalCompositeOperation = 'screen';
  fireflies.forEach(f => {
    f.drift += 0.002 * M.speed;
    f.vx += Math.sin(f.drift) * 0.005;
    f.vy += Math.cos(f.drift * 0.7) * 0.005;
    f.vx *= 0.99; f.vy *= 0.99;
    f.x += f.vx * M.speed;
    f.y += f.vy * M.speed;

    if (f.x < -20) f.x = W + 20;
    if (f.x > W + 20) f.x = -20;
    if (f.y < -20) f.y = H + 20;
    if (f.y > H + 20) f.y = -20;

    // Pulse glow
    let brightness = 0.3 + 0.3 * Math.sin(t * f.pulseSpeed + f.phase);

    // Occasional flash
    f.flashTimer += dt;
    if (f.flashTimer > f.flashInterval) {
      f.flashTimer = 0;
      f.flashInterval = 5000 + Math.random() * 10000;
    }
    const flashProgress = f.flashTimer / 400;
    if (flashProgress < 1) {
      brightness += (1 - flashProgress) * 0.6;
    }

    const c = _rcColors[f.ci];
    const glowR = f.sz * 8;
    const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowR);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${brightness * 0.4})`);
    grad.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${brightness * 0.15})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(f.x, f.y, glowR, 0, TWO_PI); ctx.fill();

    // Core
    ctx.beginPath(); ctx.arc(f.x, f.y, f.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${brightness * 0.8})`;
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
}

// ══════════════════════════════════════════════════════
// SCENE 8: SPIRAL
// ══════════════════════════════════════════════════════
function drawSpiral(t) {
  const cx = W / 2, cy = H / 2;
  const arms = 5;
  const maxR = Math.min(W, H) * 0.45;
  const breathe = 1 + 0.08 * Math.sin(t * 0.0003);
  const globalRot = t * 0.00008;

  ctx.save();
  ctx.translate(cx, cy);

  for (let arm = 0; arm < arms; arm++) {
    const armAngle = (arm / arms) * TWO_PI;
    const c = _rcColors[arm % 6];

    // Spiral curve
    ctx.beginPath();
    for (let i = 0; i < 200; i++) {
      const frac = i / 200;
      const r = maxR * frac * breathe;
      const a = armAngle + globalRot + frac * Math.PI * 4 + Math.sin(t * 0.0004 + arm) * 0.3;
      const wobble = Math.sin(t * 0.0005 + i * 0.1 + arm * 2) * 8 * frac;
      const px = Math.cos(a) * (r + wobble);
      const py = Math.sin(a) * (r + wobble);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    const alpha = 0.04 + 0.02 * Math.sin(t * 0.0003 + arm);
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glow along spiral
    for (let i = 0; i < 30; i++) {
      const frac = i / 30;
      const r = maxR * frac * breathe;
      const a = armAngle + globalRot + frac * Math.PI * 4 + Math.sin(t * 0.0004 + arm) * 0.3;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      const sz = 5 + frac * 15;
      const glowAlpha = 0.03 + 0.02 * Math.sin(t * 0.001 + i * 1.5 + arm);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, sz);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${glowAlpha})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, sz, 0, TWO_PI); ctx.fill();
    }
  }

  // Center glow
  const cc = _rcColors[0];
  for (let r = 2; r >= 0; r--) {
    const rr = (15 + r * 20) * breathe;
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    grad.addColorStop(0, `rgba(${cc[0]},${cc[1]},${cc[2]},${0.12 - r * 0.03})`);
    grad.addColorStop(1, `rgba(${cc[0]},${cc[1]},${cc[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, TWO_PI); ctx.fill();
  }

  ctx.restore();

  // Floating particles along spirals
  const pc = _rcParticle;
  for (let i = 0; i < 40; i++) {
    const arm = i % arms;
    const frac = (t * 0.00005 * M.speed + i / 40) % 1;
    const r = maxR * frac * breathe;
    const a = (arm / arms) * TWO_PI + globalRot + frac * Math.PI * 4;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    const sz = 1 + (1 - frac) * 1.5;
    const op = 0.15 + 0.1 * Math.sin(t * 0.001 + i * 2);
    ctx.beginPath(); ctx.arc(px, py, sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`; ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE 9: RAIN
// ══════════════════════════════════════════════════════
let raindrops = [], ripples = [];

function initRain() {
  raindrops = Array.from({ length: 150 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: 2 + Math.random() * 4,
    len: 10 + Math.random() * 20,
    opacity: 0.1 + Math.random() * 0.3,
    layer: Math.floor(Math.random() * 3)
  }));
  ripples = [];
}

const _layerSpeeds = [0.6, 1, 1.5];
const _layerAlphas = [0.5, 0.8, 1];

function drawRain(t, dt) {
  // Rain streaks
  const pc = _rcParticle;
  raindrops.forEach(d => {
    const layerSpeed = _layerSpeeds[d.layer];
    const layerAlpha = _layerAlphas[d.layer];
    d.y += d.speed * layerSpeed * M.speed;
    d.x += Math.sin(t * 0.0002 + d.x * 0.01) * 0.3;

    if (d.y > H) {
      // Spawn ripple
      if (Math.random() < 0.3) {
        ripples.push({
          x: d.x, y: H * (0.7 + Math.random() * 0.3),
          r: 0, maxR: 15 + Math.random() * 25,
          life: 0, maxLife: 800 + Math.random() * 400,
          ci: Math.floor(Math.random() * 6)
        });
      }
      d.y = -d.len;
      d.x = Math.random() * W;
    }

    const alpha = d.opacity * layerAlpha;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + Math.sin(t * 0.0002) * 2, d.y + d.len * layerSpeed);
    ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha})`;
    ctx.lineWidth = d.layer === 2 ? 1.5 : 0.8;
    ctx.stroke();
  });

  // Ripples
  ripples.forEach(r => {
    r.life += dt;
    const progress = r.life / r.maxLife;
    r.r = r.maxR * progress;
    const alpha = (1 - progress) * 0.12;
    const c = _rcColors[r.ci];

    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, TWO_PI);
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ripples = ripples.filter(r => r.life < r.maxLife);

  // Ambient mist
  for (let i = 0; i < 5; i++) {
    const mx = W * (0.1 + i * 0.2) + Math.sin(t * 0.0001 + i * 3) * 100;
    const my = H * 0.75 + Math.sin(t * 0.00015 + i * 2) * 30;
    const mr = 80 + 40 * Math.sin(t * 0.0002 + i);
    const c = _rcColors[i % 6];
    const grad = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.03)`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TWO_PI); ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE 10: PLASMA
// ══════════════════════════════════════════════════════
function drawPlasma(t) {
  const step = window._castReceiver ? 10 : 5;
  const timeScale = t * 0.001;

  for (let x = 0; x < W; x += step) {
    for (let y = 0; y < H; y += step) {
      const nx = x / W, ny = y / H;

      const v1 = Math.sin(nx * 6 + timeScale * 0.3);
      const v2 = Math.sin(ny * 8 - timeScale * 0.4);
      const v3 = Math.sin((nx + ny) * 5 + timeScale * 0.2);
      const v4 = Math.sin(Math.sqrt(((nx - 0.5) * (nx - 0.5) + (ny - 0.5) * (ny - 0.5))) * 12 - timeScale * 0.5);

      const v = (v1 + v2 + v3 + v4) * 0.25; // -1 to 1

      const ci1 = Math.floor((v * 0.5 + 0.5) * 3) % 6;
      const ci2 = (ci1 + 3) % 6;
      const blend = (Math.sin(v * Math.PI) * 0.5 + 0.5);

      const c1 = M.colors[ci1], c2 = M.colors[ci2];
      const r = c1[0] * (1 - blend) + c2[0] * blend;
      const g = c1[1] * (1 - blend) + c2[1] * blend;
      const b = c1[2] * (1 - blend) + c2[2] * blend;
      const alpha = 0.15 + 0.1 * (v * 0.5 + 0.5);

      ctx.fillStyle = `rgba(${r | 0},${g | 0},${b | 0},${alpha})`;
      ctx.fillRect(x, y, step + 1, step + 1);
    }
  }

  // Bright spots
  const pc = _rcParticle;
  for (let i = 0; i < 20; i++) {
    const px = W * (0.5 + 0.4 * Math.sin(timeScale * 0.2 + i * 1.7));
    const py = H * (0.5 + 0.4 * Math.cos(timeScale * 0.15 + i * 2.3));
    const sz = 3 + 2 * Math.sin(timeScale * 0.5 + i);
    const op = 0.1 + 0.08 * Math.sin(timeScale * 0.3 + i * 1.1);
    ctx.beginPath(); ctx.arc(px, py, sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`; ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE 11: AURORA
// ══════════════════════════════════════════════════════
function drawAurora(t) {
  const bands = window._castReceiver ? 5 : 8;

  for (let b = 0; b < bands; b++) {
    const yBase = H * (0.15 + b * 0.08);
    const c = _rcColors[b % 6];
    const waveSpeed = t * (0.0002 + b * 0.00003);
    const amplitude = 40 + 25 * Math.sin(t * 0.0001 + b * 1.5);

    // Compute wave positions once, reuse for curtain + edge glow
    const noiseY = b * 7 + t * 0.00004;
    const baseAlpha = 0.03 + 0.02 * Math.sin(t * 0.0003 + b);
    const sinOffset = t * 0.0003 + b;

    // Aurora curtain — vertical gradient strips
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const n = noise2D(x * 0.003 + waveSpeed, noiseY);
      const waveY = yBase + n * amplitude + Math.sin(x * 0.008 + sinOffset) * amplitude * 0.4;
      const curtainH = 60 + 40 * (noise2D(x * 0.005 + b * 3, t * 0.00005) * 0.5 + 0.5);
      const shimmer = 0.5 + 0.5 * Math.sin(t * 0.002 + x * 0.02 + b * 3);
      const alpha = baseAlpha * shimmer;

      const grad = ctx.createLinearGradient(x, waveY, x, waveY + curtainH);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 1.5})`);
      grad.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(x, waveY, 5, curtainH);

      // Build edge path simultaneously
      x === 0 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY);
    }

    // Top edge glow (path already built above)
    const edgeAlpha = 0.06 + 0.03 * Math.sin(t * 0.0004 + b * 2);
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${edgeAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Stars behind aurora
  const pc = _rcParticle;
  for (let i = 0; i < 30; i++) {
    const sx = (i * W / 30 + t * 0.001) % W;
    const sy = H * (0.05 + (noise2D(i * 5, 0) * 0.5 + 0.5) * 0.5);
    const twinkle = 0.15 + 0.1 * Math.sin(t * (0.002 + i * 0.0003) + i * 2);
    ctx.beginPath(); ctx.arc(sx, sy, 1, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${twinkle})`; ctx.fill();
  }
}

// ══════════════════════════════════════════════════════
// SCENE MANAGEMENT
// ══════════════════════════════════════════════════════
let currentScene = 'deep';
let sceneAlpha = 1;
let fadingOut = false;
let nextScene = null;

const SCENES = {
  deep:      { init: initDeep,      draw: drawDeep },
  mandala:   { init: () => {},      draw: drawMandala },
  cosmos:    { init: initCosmos,    draw: drawCosmos },
  liquid:    { init: initLiquid,    draw: drawLiquid },
  waves:     { init: () => {},      draw: drawWaves },
  kaleido:   { init: () => {},      draw: drawKaleido },
  fireflies: { init: initFireflies, draw: drawFireflies },
  spiral:    { init: () => {},      draw: drawSpiral },
  rain:      { init: initRain,      draw: drawRain },
  plasma:    { init: () => {},      draw: drawPlasma },
  aurora2:   { init: () => {},      draw: drawAurora },
};

function initCurrentScene() { SCENES[currentScene].init(); }
initDeep();

function switchScene(name) {
  if (name === currentScene) return;
  nextScene = name;
  fadingOut = true;
}

// ══════════════════════════════════════════════════════
// AUTO MOOD
// ══════════════════════════════════════════════════════
let autoMood = false;
let autoMoodTimer = 0;
const AUTO_MOOD_INTERVAL = 30000;
const moodKeys = Object.keys(MOODS);
let autoMoodIndex = 0;

function toggleAutoMood() {
  autoMood = !autoMood;
  autoMoodTimer = 0;
  const btn = document.getElementById('autoMoodBtn');
  if (btn) btn.classList.toggle('active', autoMood);
}

function updateAutoMood(dt) {
  if (!autoMood) return;
  autoMoodTimer += dt;
  if (autoMoodTimer >= AUTO_MOOD_INTERVAL) {
    autoMoodTimer = 0;
    autoMoodIndex = (autoMoodIndex + 1) % moodKeys.length;
    const name = moodKeys[autoMoodIndex];
    targetMood = MOODS[name];
    currentMood = name;
    // Update mood button visuals
    document.querySelectorAll('.mood-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mood === name);
    });
  }
}

// ══════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════
let lastTime = 0, globalTime = 0, started = false;

function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  globalTime += dt;

  updateMoodLerp();
  cacheRoundedColors();
  updateAutoMood(dt);

  // Background
  const [br, bg, bb] = M.bg;
  ctx.fillStyle = `rgb(${Math.round(br)},${Math.round(bg)},${Math.round(bb)})`;
  ctx.fillRect(0, 0, W, H);

  // Scene crossfade
  if (fadingOut) {
    sceneAlpha -= dt * 0.002;
    if (sceneAlpha <= 0) {
      sceneAlpha = 0;
      currentScene = nextScene;
      SCENES[currentScene].init();
      fadingOut = false;
      nextScene = null;
    }
  } else if (sceneAlpha < 1) {
    sceneAlpha += dt * 0.002;
    if (sceneAlpha > 1) sceneAlpha = 1;
  }

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  SCENES[currentScene].draw(globalTime, dt);
  ctx.restore();

  requestAnimationFrame(animate);
}

// ══════════════════════════════════════════════════════
// UI & EVENTS
// ══════════════════════════════════════════════════════

// Cursor glow
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow) {
  document.addEventListener('mousemove', e => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
  });
}

// Auto-hide UI
let uiTimeout;
function showUI() {
  document.body.classList.add('show-ui');
  clearTimeout(uiTimeout);
  uiTimeout = setTimeout(() => document.body.classList.remove('show-ui'), 4000);
}
document.addEventListener('mousemove', showUI);
document.addEventListener('touchstart', showUI);

// Mood buttons
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    targetMood = MOODS[btn.dataset.mood];
  });
});

// Scene buttons
document.querySelectorAll('.scene-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchScene(btn.dataset.scene);
  });
});

// Fullscreen
const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  });
}

// Start
const titleOverlay = document.getElementById('titleOverlay');
function start() {
  if (titleOverlay) titleOverlay.classList.add('hidden');
  started = true;
}
if (titleOverlay) {
  titleOverlay.addEventListener('click', start);
  if (!window._castReceiver) {
    document.addEventListener('keydown', () => { if (!started) start(); });
  }
}

// Go
requestAnimationFrame(animate);
