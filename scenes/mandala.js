// Mandala scene
function drawMandala(t) {
  const cx = W / 2, cy = H / 2;
  const maxR = Math.min(W, H) * 0.42;
  const breathScale = 1 + 0.06 * Math.sin(t * 0.0004);

  for (let layer = 0; layer < 5; layer++) {
    const petals = 6 + layer * 2;
    const ringR = maxR * (0.25 + layer * 0.18) * breathScale;
    const rot = t * (0.00008 + layer * 0.00003) * (layer % 2 === 0 ? 1 : -1);
    const petalR = ringR * (0.35 - layer * 0.03);
    const c = _rcColors[layer % 6];
    const alpha = 0.06 + 0.02 * Math.sin(t * 0.0003 + layer);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * TWO_PI;
      const px = Math.cos(a) * ringR;
      const py = Math.sin(a) * ringR;
      const wobble = 1 + 0.15 * Math.sin(t * 0.0005 + i * 2.3 + layer);

      ctx.beginPath();
      ctx.ellipse(px, py, petalR * wobble, petalR * wobble * 0.5, a, 0, TWO_PI);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, petalR * wobble);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 1.5})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      const nextA = ((i + 1) / petals) * TWO_PI;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(Math.cos(nextA) * ringR, Math.sin(nextA) * ringR);
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Center glow
  const cc = _rcColors[0];
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3 * breathScale);
  cGrad.addColorStop(0, `rgba(${cc[0]},${cc[1]},${cc[2]},0.12)`);
  cGrad.addColorStop(1, `rgba(${cc[0]},${cc[1]},${cc[2]},0)`);
  ctx.fillStyle = cGrad;
  ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.3 * breathScale, 0, TWO_PI); ctx.fill();

  // Outer rings
  for (let r = 0; r < 3; r++) {
    const rr = maxR * (0.9 + r * 0.08) * breathScale;
    const pulse = 0.03 + 0.02 * Math.sin(t * 0.0006 + r);
    const rc = _rcColors[(r + 3) % 6];
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TWO_PI);
    ctx.strokeStyle = `rgba(${rc[0]},${rc[1]},${rc[2]},${pulse})`;
    ctx.lineWidth = 1; ctx.stroke();
  }

  // Floating dots
  for (let i = 0; i < 40; i++) {
    const a = t * 0.0001 + i * 0.157;
    const dist = maxR * (0.5 + 0.5 * Math.sin(t * 0.0002 + i * 0.7)) * breathScale;
    const px = cx + Math.cos(a) * dist, py = cy + Math.sin(a) * dist;
    const sz = 1 + Math.sin(t * 0.001 + i) * 0.8;
    const op = 0.15 + 0.1 * Math.sin(t * 0.0008 + i * 1.3);
    const pc = _rcParticle;
    ctx.beginPath(); ctx.arc(px, py, sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`; ctx.fill();
  }
}

SCENES.mandala = { init: () => {}, draw: drawMandala };
