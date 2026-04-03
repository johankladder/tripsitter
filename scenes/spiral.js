// Spiral scene
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

SCENES.spiral = { init: () => {}, draw: drawSpiral };
