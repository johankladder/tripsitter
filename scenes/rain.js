// Rain scene
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
  const windX = Math.sin(t * 0.0002) * 2;
  for (let i = 0; i < raindrops.length; i++) {
    const d = raindrops[i];
    const layerSpeed = _layerSpeeds[d.layer];
    const layerAlpha = _layerAlphas[d.layer];
    d.y += d.speed * layerSpeed * M.speed;
    d.x += Math.sin(t * 0.0002 + d.x * 0.01) * 0.3;

    if (d.y > H) {
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
    ctx.lineTo(d.x + windX, d.y + d.len * layerSpeed);
    ctx.strokeStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha})`;
    ctx.lineWidth = d.layer === 2 ? 1.5 : 0.8;
    ctx.stroke();
  }

  // Ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.life += dt;
    if (r.life >= r.maxLife) { ripples.splice(i, 1); continue; }
    const progress = r.life / r.maxLife;
    r.r = r.maxR * progress;
    const alpha = (1 - progress) * 0.12;
    const c = _rcColors[r.ci];

    ctx.beginPath();
    ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, TWO_PI);
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

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

SCENES.rain = { init: initRain, draw: drawRain };
