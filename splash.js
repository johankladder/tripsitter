// Particle entrance animation for the splash screen
(function () {
  const overlay = document.getElementById('titleOverlay');
  const splashCanvas = document.getElementById('splashCanvas');
  const title = document.getElementById('splashTitle');
  const sub = document.getElementById('splashSub');
  if (!splashCanvas || !title) return;

  const sCtx = splashCanvas.getContext('2d');
  let sW, sH;

  function resizeSplash() {
    sW = splashCanvas.width = window.innerWidth;
    sH = splashCanvas.height = window.innerHeight;
  }
  resizeSplash();
  window.addEventListener('resize', resizeSplash);

  // Sample text pixels to get target positions
  function sampleText(text, font, yOffset) {
    const offscreen = document.createElement('canvas');
    offscreen.width = sW;
    offscreen.height = sH;
    const oCtx = offscreen.getContext('2d');
    oCtx.fillStyle = '#fff';
    oCtx.font = font;
    oCtx.textAlign = 'center';
    oCtx.textBaseline = 'middle';
    oCtx.fillText(text, sW / 2, sH / 2 + yOffset);
    const imageData = oCtx.getImageData(0, 0, sW, sH);
    const points = [];
    const step = Math.max(3, Math.floor(sW / 400));
    for (let y = 0; y < sH; y += step) {
      for (let x = 0; x < sW; x += step) {
        if (imageData.data[(y * sW + x) * 4 + 3] > 128) {
          points.push({ x, y });
        }
      }
    }
    return points;
  }

  // Compute font size to match CSS clamp
  const vw = sW / 100;
  const titleSize = Math.max(40, Math.min(6 * vw, 80));
  const titleFont = `300 ${titleSize}px 'Cormorant Garamond', serif`;
  const subSize = Math.max(11, Math.min(0.85 * 16, 14));
  const subFont = `300 ${subSize}px 'Quicksand', sans-serif`;

  const titleTargets = sampleText('tripsitter', titleFont, -12);
  const subTargets = sampleText('tap anywhere to begin', subFont, titleSize * 0.5 + 10);
  const allTargets = titleTargets.concat(subTargets);

  // Create particles — start scattered
  const particles = allTargets.map((target, i) => {
    const isTitle = i < titleTargets.length;
    const angle = Math.random() * TWO_PI;
    const dist = 200 + Math.random() * Math.max(sW, sH) * 0.5;
    return {
      x: sW / 2 + Math.cos(angle) * dist,
      y: sH / 2 + Math.sin(angle) * dist,
      tx: target.x,
      ty: target.y,
      sz: isTitle ? 1.5 + Math.random() * 1 : 0.8 + Math.random() * 0.6,
      speed: 0.01 + Math.random() * 0.02,
      arrived: false,
      delay: Math.random() * 1500,
      hue: isTitle ? 260 + Math.random() * 40 : 160 + Math.random() * 40,
      drift: Math.random() * TWO_PI,
      driftSpeed: 0.001 + Math.random() * 0.002,
    };
  });

  let splashTime = 0;
  let revealed = false;
  let arrivedCount = 0;
  const totalParticles = particles.length;

  function animateSplash(timestamp) {
    if (!overlay || overlay.classList.contains('hidden')) return;

    splashTime += 16;
    sCtx.clearRect(0, 0, sW, sH);

    // Dark overlay that fades as particles converge
    const convergence = Math.min(1, arrivedCount / (totalParticles * 0.7));
    const bgAlpha = 0.85 - convergence * 0.45;
    sCtx.fillStyle = `rgba(5, 5, 16, ${bgAlpha})`;
    sCtx.fillRect(0, 0, sW, sH);

    arrivedCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (splashTime < p.delay) continue;

      const elapsed = splashTime - p.delay;
      const progress = Math.min(1, elapsed * p.speed * 0.06);
      // Smooth easing
      const ease = 1 - Math.pow(1 - progress, 3);

      p.x = p.x + (p.tx - p.x) * (p.speed * 2);
      p.y = p.y + (p.ty - p.y) * (p.speed * 2);

      // Add gentle drift once close
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        p.arrived = true;
        arrivedCount++;
        p.drift += p.driftSpeed;
        p.x = p.tx + Math.sin(p.drift) * 0.8;
        p.y = p.ty + Math.cos(p.drift * 0.7) * 0.8;
      }

      // Particle trail when moving
      const alpha = p.arrived ? 0.6 + 0.2 * Math.sin(splashTime * 0.003 + i) : 0.4 + ease * 0.3;
      const sat = p.arrived ? '60%' : '80%';
      const light = p.arrived ? '75%' : '65%';

      // Glow
      if (!p.arrived && dist > 5) {
        sCtx.beginPath();
        sCtx.arc(p.x, p.y, p.sz * 4, 0, TWO_PI);
        sCtx.fillStyle = `hsla(${p.hue}, ${sat}, ${light}, ${alpha * 0.1})`;
        sCtx.fill();
      }

      // Core
      sCtx.beginPath();
      sCtx.arc(p.x, p.y, p.sz, 0, TWO_PI);
      sCtx.fillStyle = `hsla(${p.hue}, ${sat}, ${light}, ${alpha})`;
      sCtx.fill();
    }

    // Reveal text once most particles have arrived
    if (!revealed && arrivedCount > totalParticles * 0.65) {
      revealed = true;
      title.classList.add('revealed');
      if (sub) sub.classList.add('revealed');
    }

    requestAnimationFrame(animateSplash);
  }

  // Start splash animation
  requestAnimationFrame(animateSplash);
})();
