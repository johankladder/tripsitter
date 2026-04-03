// Waves scene
function drawWaves(t) {
  const layers = 8;

  for (let l = 0; l < layers; l++) {
    const yBase = H * (0.25 + l * 0.08);
    const c = _rcColors[l % 6];
    const amplitude = 30 + l * 12 + 20 * Math.sin(t * 0.0002 + l);
    const freq = 0.003 - l * 0.0002;
    const speed = t * (0.0003 + l * 0.00005) * (l % 2 === 0 ? 1 : -1);
    const alpha = 0.04 + 0.02 * Math.sin(t * 0.0003 + l * 1.1);

    // Compute wave points once, reuse for fill and stroke
    const noiseY = l * 10 + t * 0.00005;
    const sinOffset = t * 0.0004 + l;
    const waveYs = [];
    for (let x = 0; x <= W; x += 3) {
      const n = noise2D(x * freq + speed, noiseY);
      waveYs.push(yBase + n * amplitude + Math.sin(x * 0.01 + sinOffset) * amplitude * 0.3);
    }

    // Fill below wave
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let j = 0, x = 0; x <= W; x += 3, j++) ctx.lineTo(x, waveYs[j]);
    ctx.lineTo(W, H); ctx.closePath();
    const grad = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude + H * 0.3);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha})`);
    grad.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.5})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad; ctx.fill();

    // Wave line
    ctx.beginPath();
    for (let j = 0, x = 0; x <= W; x += 3, j++) {
      x === 0 ? ctx.moveTo(x, waveYs[j]) : ctx.lineTo(x, waveYs[j]);
    }
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * 2})`;
    ctx.lineWidth = 1; ctx.stroke();
  }

  // Foam sparkles
  const pc = _rcParticle;
  for (let i = 0; i < 50; i++) {
    const x = (t * 0.03 * M.speed + i * W / 50) % W;
    const l = i % layers;
    const yBase = H * (0.25 + l * 0.08);
    const freq = 0.003 - l * 0.0002;
    const speed = t * (0.0003 + l * 0.00005) * (l % 2 === 0 ? 1 : -1);
    const n = noise2D(x * freq + speed, l * 10 + t * 0.00005);
    const amplitude = 30 + l * 12 + 20 * Math.sin(t * 0.0002 + l);
    const y = yBase + n * amplitude + Math.sin(x * 0.01 + t * 0.0004 + l) * amplitude * 0.3;
    const op = 0.1 + 0.15 * Math.sin(t * 0.002 + i * 2.1);
    ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${op})`; ctx.fill();
  }
}

SCENES.waves = { init: () => {}, draw: drawWaves };
