// Ink scene — explosive drops of ink bursting and diffusing in water
let inkDrops = [], inkMotes = [], inkSplats = [];

function initInk() {
  inkDrops = [];
  inkSplats = [];
  inkMotes = Array.from({ length: 80 }, () => createMote());
  // Seed initial drops
  for (let i = 0; i < 3; i++) spawnDrop();
}

function createMote() {
  return {
    x: Math.random() * W, y: Math.random() * H,
    sz: Math.random() * 1.5 + 0.3,
    vx: (Math.random() - 0.5) * 0.08,
    vy: (Math.random() - 0.5) * 0.08,
    op: 0, mop: Math.random() * 0.25 + 0.05,
    life: 0, ml: Math.random() * 18000 + 8000,
    ci: Math.floor(Math.random() * 6),
    drift: Math.random() * TWO_PI
  };
}

function spawnSplat(cx, cy, ci, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TWO_PI;
    const speed = 1.5 + Math.random() * 4;
    inkSplats.push({
      x: cx, y: cy,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      sz: 2 + Math.random() * 5,
      ci: ci,
      life: 0,
      ml: 3000 + Math.random() * 4000,
      drag: 0.96 + Math.random() * 0.03,
      trail: []
    });
  }
}

function spawnDrop() {
  const cx = W * (0.1 + Math.random() * 0.8);
  const cy = H * (0.1 + Math.random() * 0.8);
  const ci = Math.floor(Math.random() * 6);
  const maxR = Math.min(W, H) * (0.12 + Math.random() * 0.18);
  const numLobes = 7 + Math.floor(Math.random() * 5);
  const lobes = [];
  for (let i = 0; i < numLobes; i++) {
    const a = (i / numLobes) * TWO_PI + (Math.random() - 0.5) * 0.5;
    lobes.push({
      angle: a,
      reach: 0.8 + Math.random() * 0.8,
      speed: 1.2 + Math.random() * 1.5,
      nOff: Math.random() * 1000,
      wobble: 0.2 + Math.random() * 0.4
    });
  }

  // Spawn explosive splatter particles
  spawnSplat(cx, cy, ci, 12 + Math.floor(Math.random() * 10));

  inkDrops.push({
    cx, cy, ci, maxR, lobes,
    age: 0,
    growDur: 4000 + Math.random() * 4000,
    fadeDur: 8000 + Math.random() * 6000,
    opacity: 0,
    nSeed: Math.random() * 500,
    turbulence: 0.5 + Math.random() * 0.6,
    ringCount: 4 + Math.floor(Math.random() * 3),
    burstPhase: 0
  });
}

function drawInk(t, dt) {
  const spd = M.speed;

  // Spawn new drops — more frequently for energy
  const spawnRate = 3500 + Math.random() * 1500;
  if (inkDrops.length === 0 || (inkDrops.length < 10 && Math.random() < dt / spawnRate)) {
    spawnDrop();
  }

  // Screen blend for bright overlapping
  ctx.globalCompositeOperation = 'screen';

  // Draw splatter particles
  for (let si = inkSplats.length - 1; si >= 0; si--) {
    const s = inkSplats[si];
    s.life += dt * spd;
    if (s.life > s.ml) { inkSplats.splice(si, 1); continue; }

    const lr = s.life / s.ml;
    let op = lr < 0.05 ? lr / 0.05 : 1 - (lr * lr);
    op *= 0.4;

    // Physics
    s.x += s.vx * spd;
    s.y += s.vy * spd;
    s.vx *= s.drag;
    s.vy *= s.drag;

    // Store trail
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 12) s.trail.shift();

    const c = M.colors[s.ci];
    const sz = s.sz * (1 - lr * 0.5);

    // Trail
    if (s.trail.length > 2) {
      ctx.beginPath();
      ctx.moveTo(s.trail[0].x, s.trail[0].y);
      for (let ti = 1; ti < s.trail.length; ti++) {
        ctx.lineTo(s.trail[ti].x, s.trail[ti].y);
      }
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${op * 0.3})`;
      ctx.lineWidth = sz * 0.6;
      ctx.stroke();
    }

    // Splat head with glow
    ctx.beginPath();
    ctx.arc(s.x, s.y, sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${op})`;
    ctx.fill();

    // Glow halo
    ctx.beginPath();
    ctx.arc(s.x, s.y, sz * 3, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${op * 0.12})`;
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';

  // Draw drops — oldest first for layering
  for (let di = inkDrops.length - 1; di >= 0; di--) {
    const d = inkDrops[di];
    d.age += dt * spd;

    // Fast initial burst then slow spread
    const growProgress = Math.min(1, d.age / d.growDur);
    // Explosive ease: fast start, slow tail
    const growEased = 1 - Math.pow(1 - growProgress, 0.5);

    const fadeAge = d.age - d.growDur;
    const fadeProgress = fadeAge > 0 ? Math.min(1, fadeAge / d.fadeDur) : 0;

    if (fadeProgress >= 1) { inkDrops.splice(di, 1); continue; }

    // Burst opacity — bright flash on impact
    let op;
    if (growProgress < 0.05) {
      op = growProgress / 0.05;
    } else if (growProgress < 0.15) {
      op = 1 + 0.3 * (1 - (growProgress - 0.05) / 0.1); // bright burst
    } else if (fadeProgress > 0) {
      op = 1 - fadeProgress * fadeProgress;
    } else {
      op = 1;
    }
    d.opacity = Math.min(op, 1.3);

    const c = M.colors[d.ci];
    const c2 = M.colors[(d.ci + 2) % 6]; // secondary color for depth
    const currentR = d.maxR * growEased;
    const time = t * 0.001;

    // Impact shockwave ring — early burst
    if (growProgress > 0.02 && growProgress < 0.4) {
      const shockProgress = (growProgress - 0.02) / 0.38;
      const shockR = d.maxR * 1.3 * shockProgress;
      const shockOp = op * 0.08 * (1 - shockProgress);
      ctx.beginPath();
      ctx.arc(d.cx, d.cy, shockR, 0, TWO_PI);
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${shockOp})`;
      ctx.lineWidth = 2 + (1 - shockProgress) * 4;
      ctx.stroke();
    }

    // Draw multiple diffusion rings (inner → outer)
    for (let ring = d.ringCount - 1; ring >= 0; ring--) {
      const ringT = (ring + 1) / d.ringCount;
      const ringR = currentR * ringT;
      const ringOp = Math.min(1, op) * (0.05 + 0.1 * (1 - ringT));
      const useColor = ring % 2 === 0 ? c : c2;

      // Build organic boundary with noise-displaced lobes
      const segments = 72;
      ctx.beginPath();
      for (let si = 0; si <= segments; si++) {
        const a = (si / segments) * TWO_PI;

        let r = 0.4;
        for (let li = 0; li < d.lobes.length; li++) {
          const lb = d.lobes[li];
          let diff = a - lb.angle;
          if (diff > Math.PI) diff -= TWO_PI;
          if (diff < -Math.PI) diff += TWO_PI;
          const influence = Math.exp(-diff * diff * 1.5);
          const growth = Math.min(1, growEased * lb.speed);
          r += lb.reach * influence * growth;
        }

        // Strong noise turbulence
        const nx = Math.cos(a) * 2.5 + d.nSeed;
        const ny = Math.sin(a) * 2.5 + time * 0.5;
        const n = noise2D(nx, ny);
        r += n * d.turbulence * growEased;

        // Jagged wobble for explosive feel
        r += Math.sin(a * 7 + time * 0.8 + ring) * 0.08 * growEased;
        r += Math.sin(a * 13 + d.nSeed) * 0.04 * growEased;

        const px = d.cx + Math.cos(a) * ringR * r;
        const py = d.cy + Math.sin(a) * ringR * r;
        if (si === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const grad = ctx.createRadialGradient(d.cx, d.cy, 0, d.cx, d.cy, ringR * 1.6);
      grad.addColorStop(0, `rgba(${useColor[0]},${useColor[1]},${useColor[2]},${ringOp * 1.8})`);
      grad.addColorStop(0.3, `rgba(${useColor[0]},${useColor[1]},${useColor[2]},${ringOp})`);
      grad.addColorStop(1, `rgba(${useColor[0]},${useColor[1]},${useColor[2]},0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Explosive tendrils — thicker, faster, more chaotic
    if (growProgress > 0.08) {
      const tendrilCount = d.lobes.length;
      for (let ti = 0; ti < tendrilCount; ti++) {
        const lb = d.lobes[ti];
        const tendrilProgress = Math.min(1, (growProgress - 0.08) / 3.0) * lb.speed;
        const tendrilLen = currentR * lb.reach * tendrilProgress * 1.8;
        const steps = 25;
        const tendrilOp = Math.min(1, op) * 0.1 * (1 - fadeProgress * 0.5);

        ctx.beginPath();
        let tx = d.cx + Math.cos(lb.angle) * currentR * 0.3;
        let ty = d.cy + Math.sin(lb.angle) * currentR * 0.3;
        ctx.moveTo(tx, ty);

        let angle = lb.angle;
        for (let si = 1; si <= steps; si++) {
          const st = si / steps;
          const tn = noise2D(lb.nOff + st * 4, time * 0.06 + ti);
          angle += tn * 1.2;
          tx += Math.cos(angle) * (tendrilLen / steps);
          ty += Math.sin(angle) * (tendrilLen / steps);
          ctx.lineTo(tx, ty);
        }

        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${tendrilOp})`;
        ctx.lineWidth = 1.5 + (1 - tendrilProgress) * 3.5;
        ctx.stroke();

        // Tendril tip splat
        if (tendrilProgress > 0.5) {
          const tipOp = tendrilOp * 0.6 * (tendrilProgress - 0.5) * 2;
          const tipR = 3 + Math.random() * 4;
          ctx.beginPath();
          ctx.arc(tx, ty, tipR, 0, TWO_PI);
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${tipOp})`;
          ctx.fill();
        }
      }

      // Secondary micro-tendrils between main ones
      if (growProgress > 0.15) {
        for (let ti = 0; ti < tendrilCount; ti++) {
          const lb = d.lobes[ti];
          const nextLb = d.lobes[(ti + 1) % tendrilCount];
          const midAngle = (lb.angle + nextLb.angle) / 2;
          const microProgress = Math.min(1, (growProgress - 0.15) / 3.5);
          const microLen = currentR * 0.6 * microProgress;
          const microOp = Math.min(1, op) * 0.05;

          ctx.beginPath();
          let mx = d.cx + Math.cos(midAngle) * currentR * 0.5;
          let my = d.cy + Math.sin(midAngle) * currentR * 0.5;
          ctx.moveTo(mx, my);

          let ma = midAngle;
          for (let si = 1; si <= 12; si++) {
            const st = si / 12;
            ma += noise2D(lb.nOff + 50 + st * 3, time * 0.04) * 0.9;
            mx += Math.cos(ma) * (microLen / 12);
            my += Math.sin(ma) * (microLen / 12);
            ctx.lineTo(mx, my);
          }
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${microOp})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Bright core — intense center bloom
    if (growProgress > 0.02) {
      const coreR = currentR * 0.3;
      const coreOp = Math.min(1, op) * 0.18 * (1 - fadeProgress);
      const coreGrad = ctx.createRadialGradient(d.cx, d.cy, 0, d.cx, d.cy, coreR);
      coreGrad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${coreOp * 1.5})`);
      coreGrad.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${coreOp})`);
      coreGrad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.beginPath();
      ctx.arc(d.cx, d.cy, coreR, 0, TWO_PI);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      // Hot white center flash on fresh drops
      if (growProgress < 0.2) {
        const flashOp = 0.15 * (1 - growProgress / 0.2);
        const flashR = coreR * 0.4;
        ctx.beginPath();
        ctx.arc(d.cx, d.cy, flashR, 0, TWO_PI);
        ctx.fillStyle = `rgba(255,255,255,${flashOp})`;
        ctx.fill();
      }
    }
  }

  // Floating motes
  const pc = _rcParticle;
  for (let mi = 0; mi < inkMotes.length; mi++) {
    const m = inkMotes[mi];
    m.life += dt;
    const lr = m.life / m.ml;
    m.op = lr < 0.15 ? m.mop * (lr / 0.15) : lr > 0.8 ? m.mop * (1 - (lr - 0.8) / 0.2) : m.mop;
    m.drift += 0.0008 * spd;
    m.x += (m.vx + Math.sin(m.drift) * 0.06) * spd;
    m.y += (m.vy + Math.cos(m.drift * 0.7) * 0.06) * spd;
    if (m.life > m.ml) Object.assign(m, createMote());
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${m.op})`;
    ctx.fill();
  }
}

SCENES.ink = { init: initInk, draw: drawInk };
