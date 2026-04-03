// Plasma scene — offscreen buffer at reduced resolution
let _plasmaOff = null, _plasmaCtx = null, _plasmaScale = 4;

function initPlasma() {
  _plasmaScale = window._castReceiver ? 8 : 4;
  _plasmaOff = document.createElement('canvas');
  _plasmaOff.width = Math.ceil(W / _plasmaScale);
  _plasmaOff.height = Math.ceil(H / _plasmaScale);
  _plasmaCtx = _plasmaOff.getContext('2d');
}

function drawPlasma(t) {
  if (!_plasmaOff) initPlasma();
  const oW = _plasmaOff.width, oH = _plasmaOff.height;
  const scale = _plasmaScale;
  const idata = _plasmaCtx.createImageData(oW, oH);
  const pixels = idata.data;
  const timeScale = t * 0.001;
  const invW = 1 / W, invH = 1 / H;

  for (let oy = 0; oy < oH; oy++) {
    const ny = (oy * scale) * invH;
    for (let ox = 0; ox < oW; ox++) {
      const nx = (ox * scale) * invW;

      const v1 = Math.sin(nx * 6 + timeScale * 0.3);
      const v2 = Math.sin(ny * 8 - timeScale * 0.4);
      const v3 = Math.sin((nx + ny) * 5 + timeScale * 0.2);
      const dx = nx - 0.5, dy = ny - 0.5;
      const v4 = Math.sin(Math.sqrt(dx * dx + dy * dy) * 12 - timeScale * 0.5);

      const v = (v1 + v2 + v3 + v4) * 0.25;

      const ci1 = Math.floor((v * 0.5 + 0.5) * 3) % 6;
      const ci2 = (ci1 + 3) % 6;
      const blend = Math.sin(v * Math.PI) * 0.5 + 0.5;

      const c1 = M.colors[ci1], c2 = M.colors[ci2];
      const alpha = 0.15 + 0.1 * (v * 0.5 + 0.5);
      const idx = (oy * oW + ox) * 4;
      pixels[idx]     = (c1[0] * (1 - blend) + c2[0] * blend) | 0;
      pixels[idx + 1] = (c1[1] * (1 - blend) + c2[1] * blend) | 0;
      pixels[idx + 2] = (c1[2] * (1 - blend) + c2[2] * blend) | 0;
      pixels[idx + 3] = (alpha * 255) | 0;
    }
  }
  _plasmaCtx.putImageData(idata, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(_plasmaOff, 0, 0, W, H);

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

SCENES.plasma = { init: initPlasma, draw: drawPlasma };
