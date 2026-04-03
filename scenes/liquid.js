// Liquid (metaball lava lamp) scene
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

SCENES.liquid = { init: initLiquid, draw: drawLiquid };
