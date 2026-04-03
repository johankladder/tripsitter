// Cosmos scene
let stars = [], shootingStars = [];

// Offscreen canvas for nebula — rendered at reduced resolution, scaled up
let _cosmosOff = null, _cosmosCtx = null, _cosmosScale = 4;

function initCosmos() {
  stars = Array.from({ length: 300 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    sz: Math.random() * 1.8 + 0.2,
    twinkle: Math.random() * 0.005 + 0.001,
    phase: Math.random() * TWO_PI,
    brightness: Math.random() * 0.6 + 0.2
  }));
  shootingStars = [];
  // Create offscreen canvas at 1/4 resolution
  _cosmosScale = window._castReceiver ? 8 : 4;
  _cosmosOff = document.createElement('canvas');
  _cosmosOff.width = Math.ceil(W / _cosmosScale);
  _cosmosOff.height = Math.ceil(H / _cosmosScale);
  _cosmosCtx = _cosmosOff.getContext('2d');
}

function drawCosmos(t, dt) {
  if (!_cosmosOff) initCosmos();
  // Nebula clouds — rendered to small offscreen buffer, scaled up
  const oW = _cosmosOff.width, oH = _cosmosOff.height;
  const idata = _cosmosCtx.createImageData(oW, oH);
  const pixels = idata.data;
  const scale = _cosmosScale;

  for (let oy = 0; oy < oH; oy++) {
    const y = oy * scale;
    for (let ox = 0; ox < oW; ox++) {
      const x = ox * scale;
      const n1 = noise2D(x * 0.002 + t * 0.00003, y * 0.002) * 0.5 + 0.5;
      const n2 = noise2D(x * 0.004 + 100 + t * 0.00002, y * 0.004 + 100) * 0.5 + 0.5;
      const n3 = noise2D(x * 0.001 - t * 0.00004, y * 0.001 + 200) * 0.5 + 0.5;
      const ci = Math.floor(n1 * 3);
      const ci2 = Math.floor(n2 * 3) + 3;
      const c1 = M.colors[ci % 6], c2 = M.colors[ci2 % 6];
      const blend = n2;
      const alpha = n3 * n1 * 0.12;
      const idx = (oy * oW + ox) * 4;
      pixels[idx]     = (c1[0] * (1 - blend) + c2[0] * blend) | 0;
      pixels[idx + 1] = (c1[1] * (1 - blend) + c2[1] * blend) | 0;
      pixels[idx + 2] = (c1[2] * (1 - blend) + c2[2] * blend) | 0;
      pixels[idx + 3] = (alpha * 255) | 0;
    }
  }
  _cosmosCtx.putImageData(idata, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(_cosmosOff, 0, 0, W, H);

  // Stars
  const pc = _rcParticle;
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const brightness = s.brightness * (0.6 + 0.4 * Math.sin(t * s.twinkle + s.phase));
    ctx.beginPath(); ctx.arc(s.x, s.y, s.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${brightness})`; ctx.fill();
    if (s.sz > 1.2) {
      ctx.beginPath(); ctx.arc(s.x, s.y, s.sz * 3, 0, TWO_PI);
      ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${brightness * 0.08})`; ctx.fill();
    }
  }

  // Shooting stars
  if (Math.random() < 0.003) {
    shootingStars.push({
      x: Math.random() * W, y: Math.random() * H * 0.5,
      vx: 3 + Math.random() * 3, vy: 1 + Math.random() * 2,
      life: 0, ml: 800 + Math.random() * 600, len: 40 + Math.random() * 60
    });
  }
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.life += dt; s.x += s.vx * M.speed; s.y += s.vy * M.speed;
    if (s.life >= s.ml) { shootingStars.splice(i, 1); continue; }
    const alpha = s.life < 100 ? s.life / 100 : s.life > s.ml - 200 ? (s.ml - s.life) / 200 : 1;
    const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * s.len / 4, s.y - s.vy * s.len / 4);
    grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.8})`);
    grad.addColorStop(1, `rgba(${pc[0]},${pc[1]},${pc[2]},0)`);
    ctx.beginPath(); ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * s.len / 4, s.y - s.vy * s.len / 4);
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

SCENES.cosmos = { init: initCosmos, draw: drawCosmos };
