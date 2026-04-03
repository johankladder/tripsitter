// Kaleidoscope scene
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

SCENES.kaleido = { init: () => {}, draw: drawKaleido };
