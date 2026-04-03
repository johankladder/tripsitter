// Deep Ocean scene
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
  for (let fi = 0; fi < deepFlows.length; fi++) {
    const fl = deepFlows[fi];
    fl.life += dt;
    if (fl.life > fl.ml) Object.assign(fl, createFlow());
    const lr = fl.life / fl.ml;
    let al = lr < 0.2 ? lr / 0.2 : lr > 0.7 ? 1 - (lr - 0.7) / 0.3 : 1;
    al *= 0.04;
    const c = M.colors[fl.ci];
    ctx.beginPath();
    ctx.moveTo(fl.pts[0].x, fl.pts[0].y);
    for (let i = 1; i < fl.pts.length - 1; i++) {
      const xc = (fl.pts[i].x + fl.pts[i + 1].x) / 2;
      const yc = (fl.pts[i].y + fl.pts[i + 1].y) / 2;
      const ox = Math.sin(t * 0.0003 + i * 0.5) * 3;
      const oy = Math.cos(t * 0.00025 + i * 0.5) * 3;
      ctx.quadraticCurveTo(fl.pts[i].x + ox, fl.pts[i].y + oy, xc + ox, yc + oy);
    }
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${al})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Blobs
  ctx.globalCompositeOperation = 'screen';
  for (let bi = 0; bi < deepBlobs.length; bi++) {
    const bl = deepBlobs[bi];
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
    const c = M.colors[bl.ci];
    const grad = ctx.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, radius * 1.4);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.18)`);
    grad.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},0.08)`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // Particles
  const pc = _rcParticle;
  for (let pi = 0; pi < deepParticles.length; pi++) {
    const p = deepParticles[pi];
    p.life += dt;
    const lr = p.life / p.ml;
    p.op = lr < 0.15 ? p.mop * (lr / 0.15) : lr > 0.8 ? p.mop * (1 - (lr - 0.8) / 0.2) : p.mop;
    p.op *= 0.7 + 0.3 * Math.sin(p.life * p.fs);
    p.drift += 0.001 * M.speed;
    p.x += (p.sx + Math.sin(p.drift) * 0.15) * M.speed;
    p.y += p.sy * M.speed;
    if (p.life > p.ml) { p.x = Math.random() * W; p.y = H + 20; p.life = 0; }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${p.op})`; ctx.fill();
    if (p.sz > 1.5) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.sz * 4, 0, TWO_PI);
      ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${p.op * 0.1})`; ctx.fill();
    }
  }
}

SCENES.deep = { init: initDeep, draw: drawDeep };
