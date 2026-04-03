// Plasma scene
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

SCENES.plasma = { init: () => {}, draw: drawPlasma };
