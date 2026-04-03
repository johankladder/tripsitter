// Fireflies scene
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

SCENES.fireflies = { init: initFireflies, draw: drawFireflies };
