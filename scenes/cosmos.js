// Cosmos scene
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

SCENES.cosmos = { init: initCosmos, draw: drawCosmos };
