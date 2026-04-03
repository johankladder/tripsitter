// Aurora scene
function drawAurora(t) {
  const bands = window._castReceiver ? 5 : 8;

  for (let b = 0; b < bands; b++) {
    const yBase = H * (0.15 + b * 0.08);
    const c = _rcColors[b % 6];
    const waveSpeed = t * (0.0002 + b * 0.00003);
    const amplitude = 40 + 25 * Math.sin(t * 0.0001 + b * 1.5);

    // Compute wave positions once, reuse for curtain + edge glow
    const noiseY = b * 7 + t * 0.00004;
    const baseAlpha = 0.03 + 0.02 * Math.sin(t * 0.0003 + b);
    const sinOffset = t * 0.0003 + b;

    // Aurora curtain — vertical gradient strips
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const n = noise2D(x * 0.003 + waveSpeed, noiseY);
      const waveY = yBase + n * amplitude + Math.sin(x * 0.008 + sinOffset) * amplitude * 0.4;
      const curtainH = 60 + 40 * (noise2D(x * 0.005 + b * 3, t * 0.00005) * 0.5 + 0.5);
      const shimmer = 0.5 + 0.5 * Math.sin(t * 0.002 + x * 0.02 + b * 3);
      const alpha = baseAlpha * shimmer;

      const grad = ctx.createLinearGradient(x, waveY, x, waveY + curtainH);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 1.5})`);
      grad.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(x, waveY, 5, curtainH);

      // Build edge path simultaneously
      x === 0 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY);
    }

    // Top edge glow (path already built above)
    const edgeAlpha = 0.06 + 0.03 * Math.sin(t * 0.0004 + b * 2);
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${edgeAlpha})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Stars behind aurora
  const pc = _rcParticle;
  for (let i = 0; i < 30; i++) {
    const sx = (i * W / 30 + t * 0.001) % W;
    const sy = H * (0.05 + (noise2D(i * 5, 0) * 0.5 + 0.5) * 0.5);
    const twinkle = 0.15 + 0.1 * Math.sin(t * (0.002 + i * 0.0003) + i * 2);
    ctx.beginPath(); ctx.arc(sx, sy, 1, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${twinkle})`; ctx.fill();
  }
}

SCENES.aurora2 = { init: () => {}, draw: drawAurora };
