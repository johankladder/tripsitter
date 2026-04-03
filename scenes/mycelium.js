// Mycelium — organic branching tendrils that creep, fork, and bloom
let tendrils = [];
let blooms = [];
let haze = [];
let mycelSpores = [];
let mycelGrowTimer = 0;
let mycelCycleTimer = 0;

const MAX_TENDRILS = 40;
const MAX_BLOOMS = 15;
const TENDRIL_POINTS = 80;
const CYCLE_INTERVAL = 15000; // New growth wave every 15s

function initMycelium() {
  tendrils = [];
  blooms = [];
  haze = [];
  mycelSpores = [];
  mycelGrowTimer = 0;
  mycelCycleTimer = 0;

  // Seed initial tendrils from bottom/edges — like roots creeping in
  const seeds = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < seeds; i++) {
    spawnTendril(
      Math.random() * W,
      H * (0.7 + Math.random() * 0.3),
      -Math.PI / 2 + (Math.random() - 0.5) * 1.2,
      0
    );
  }
}

function spawnTendril(x, y, angle, generation) {
  if (tendrils.length >= MAX_TENDRILS) return;
  const len = TENDRIL_POINTS - generation * 15;
  if (len < 15) return;

  tendrils.push({
    points: [{ x, y }],
    angle: angle,
    targetLen: len,
    speed: 0.03 + Math.random() * 0.02,
    ci: Math.floor(Math.random() * 6),
    thickness: Math.max(0.4, 2.5 - generation * 0.6),
    generation: generation,
    forked: false,
    forkAt: 0.3 + Math.random() * 0.4,
    wobble: Math.random() * 1000,
    alive: true,
    bloomSpawned: false,
    opacity: 1,
    fading: false
  });
}

function drawMycelium(t, dt) {
  mycelGrowTimer += dt;

  // ── GROW TENDRILS ──
  for (let i = 0; i < tendrils.length; i++) {
    const td = tendrils[i];
    if (!td.alive) continue;
    if (td.points.length >= td.targetLen) {
      td.alive = false;
      // Spawn bloom at tip of mature tendrils
      if (!td.bloomSpawned && td.generation < 2 && blooms.length < MAX_BLOOMS && Math.random() < 0.4) {
        td.bloomSpawned = true;
        const tip = td.points[td.points.length - 1];
        blooms.push({
          x: tip.x, y: tip.y,
          r: 0, maxR: 8 + Math.random() * 12,
          ci: td.ci,
          phase: Math.random() * TWO_PI,
          born: t,
          pulseSpeed: 0.001 + Math.random() * 0.001
        });
      }
      continue;
    }

    // Grow by adding points
    const growSteps = Math.max(1, Math.floor(td.speed * dt * M.speed));
    for (let s = 0; s < growSteps && td.points.length < td.targetLen; s++) {
      const last = td.points[td.points.length - 1];

      // Noise-driven angle wandering — organic, not straight
      const noiseVal = noise2D(last.x * 0.005 + td.wobble, last.y * 0.005);
      td.angle += noiseVal * 0.15;
      // Gentle upward/inward bias
      td.angle += (Math.atan2(H * 0.3 - last.y, W / 2 - last.x) - td.angle) * 0.008;

      const step = 2 + Math.random() * 1.5;
      const nx = last.x + Math.cos(td.angle) * step;
      const ny = last.y + Math.sin(td.angle) * step;

      // Stay in bounds
      if (nx < 5 || nx > W - 5 || ny < 5 || ny > H - 5) {
        td.alive = false;
        break;
      }

      td.points.push({ x: nx, y: ny });

      // Add haze at intervals
      if (td.points.length % 8 === 0) {
        haze.push({ x: nx, y: ny, r: 20 + Math.random() * 30, ci: td.ci });
        if (haze.length > 120) haze.shift();
      }

      // Fork into sub-branches
      const progress = td.points.length / td.targetLen;
      if (!td.forked && progress > td.forkAt && td.generation < 3) {
        td.forked = true;
        const forkAngle1 = td.angle + 0.4 + Math.random() * 0.5;
        const forkAngle2 = td.angle - 0.4 - Math.random() * 0.5;
        spawnTendril(nx, ny, forkAngle1, td.generation + 1);
        if (Math.random() < 0.6) {
          spawnTendril(nx, ny, forkAngle2, td.generation + 1);
        }
      }
    }
  }

  // ── LIFECYCLE: fade old growth and spawn new waves ──
  mycelCycleTimer += dt;

  // Start fading old tendrils after a cycle
  if (mycelCycleTimer >= CYCLE_INTERVAL) {
    mycelCycleTimer = 0;
    // Mark all finished tendrils as fading
    for (let i = 0; i < tendrils.length; i++) {
      if (!tendrils[i].alive) tendrils[i].fading = true;
    }
    // Mark old blooms as fading
    for (let i = 0; i < blooms.length; i++) {
      blooms[i].fading = true;
    }
    // Spawn a fresh wave of roots
    const newRoots = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < newRoots; i++) {
      // Spawn from random edges
      const edge = Math.random();
      let sx, sy, sa;
      if (edge < 0.4) {
        sx = Math.random() * W; sy = H * (0.7 + Math.random() * 0.3);
        sa = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      } else if (edge < 0.6) {
        sx = Math.random() * W; sy = Math.random() * H * 0.3;
        sa = Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      } else if (edge < 0.8) {
        sx = Math.random() * W * 0.2; sy = Math.random() * H;
        sa = (Math.random() - 0.5) * 1.2;
      } else {
        sx = W * (0.8 + Math.random() * 0.2); sy = Math.random() * H;
        sa = Math.PI + (Math.random() - 0.5) * 1.2;
      }
      spawnTendril(sx, sy, sa, 0);
    }
  }

  // Fade out and remove dead tendrils
  for (let i = tendrils.length - 1; i >= 0; i--) {
    const td = tendrils[i];
    if (td.fading) {
      td.opacity -= dt * 0.0002;
      if (td.opacity <= 0) tendrils.splice(i, 1);
    }
  }

  // Fade out and remove old blooms
  for (let i = blooms.length - 1; i >= 0; i--) {
    if (blooms[i].fading) {
      blooms[i].opacity = (blooms[i].opacity || 1) - dt * 0.0003;
      if (blooms[i].opacity <= 0) blooms.splice(i, 1);
    }
  }

  // Fade old haze
  for (let i = haze.length - 1; i >= 0; i--) {
    haze[i].opacity = (haze[i].opacity || 1) - dt * 0.00005;
    if (haze[i].opacity <= 0) haze.splice(i, 1);
  }

  // ── SPAWN SPORES from blooms ──
  for (let i = 0; i < blooms.length; i++) {
    const b = blooms[i];
    if (b.r < b.maxR) {
      b.r += dt * 0.005;
    }
    if (Math.random() < 0.002 * M.speed && mycelSpores.length < 80) {
      const angle = Math.random() * TWO_PI;
      mycelSpores.push({
        x: b.x, y: b.y,
        vx: Math.cos(angle) * (0.1 + Math.random() * 0.2),
        vy: -Math.random() * 0.4 - 0.1,
        sz: 0.5 + Math.random() * 1.2,
        life: 0, maxLife: 5000 + Math.random() * 5000,
        ci: b.ci, drift: Math.random() * TWO_PI
      });
    }
  }

  // ── UPDATE SPORES ──
  for (let i = mycelSpores.length - 1; i >= 0; i--) {
    const sp = mycelSpores[i];
    sp.life += dt;
    sp.drift += 0.002 * M.speed;
    sp.vx += Math.sin(sp.drift) * 0.002;
    sp.vy -= 0.0001; // float upward
    sp.vx *= 0.998;
    sp.vy *= 0.998;
    sp.x += sp.vx * M.speed;
    sp.y += sp.vy * M.speed;
    if (sp.life > sp.maxLife) mycelSpores.splice(i, 1);
  }

  // ── DRAW GROUND HAZE ──
  for (let i = 0; i < haze.length; i++) {
    const h = haze[i];
    const c = _rcColors[h.ci % 6];
    const hazeOp = h.opacity || 1;
    const breath = (0.015 + 0.008 * Math.sin(t * 0.0002 + i * 0.7)) * hazeOp;
    const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${breath})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TWO_PI);
    ctx.fill();
  }

  // ── DRAW TENDRILS ──
  for (let i = 0; i < tendrils.length; i++) {
    const td = tendrils[i];
    if (td.points.length < 2) continue;
    const c = _rcColors[td.ci % 6];

    // Draw as a smooth path with tapering thickness
    ctx.beginPath();
    ctx.moveTo(td.points[0].x, td.points[0].y);
    for (let j = 1; j < td.points.length - 1; j++) {
      const xc = (td.points[j].x + td.points[j + 1].x) / 2;
      const yc = (td.points[j].y + td.points[j + 1].y) / 2;
      ctx.quadraticCurveTo(td.points[j].x, td.points[j].y, xc, yc);
    }
    const last = td.points[td.points.length - 1];
    ctx.lineTo(last.x, last.y);

    // Pulsing brightness along the tendril
    const pulse = (0.04 + 0.02 * Math.sin(t * 0.0004 + i * 1.3)) * td.opacity;
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${pulse})`;
    ctx.lineWidth = td.thickness;
    ctx.stroke();

    // Glow pass
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${pulse * 0.3})`;
    ctx.lineWidth = td.thickness * 4;
    ctx.stroke();

    // Growing tip glow
    if (td.alive) {
      const tip = td.points[td.points.length - 1];
      const tipGlow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 15);
      tipGlow.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.2)`);
      tipGlow.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = tipGlow;
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 15, 0, TWO_PI);
      ctx.fill();
    }
  }

  // ── DRAW BLOOMS ──
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < blooms.length; i++) {
    const b = blooms[i];
    const c = _rcColors[b.ci % 6];
    const bloomOp = b.opacity || 1;
    const pulse = 0.6 + 0.4 * Math.sin(t * b.pulseSpeed + b.phase);
    const alpha = 0.06 * pulse * bloomOp;

    // Layered radial bloom
    for (let ring = 0; ring < 3; ring++) {
      const rr = b.r * (0.4 + ring * 0.35) * (0.9 + 0.1 * Math.sin(t * 0.001 + ring + i));
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * (1.5 - ring * 0.4)})`);
      grad.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${alpha * (0.5 - ring * 0.15)})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, rr, 0, TWO_PI);
      ctx.fill();
    }

    // Bright center dot
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2 + Math.sin(t * b.pulseSpeed + b.phase) * 1, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.15 * pulse * bloomOp})`;
    ctx.fill();
  }

  // ── DRAW SPORES ──
  const pc = _rcParticle;
  for (let i = 0; i < mycelSpores.length; i++) {
    const sp = mycelSpores[i];
    const lr = sp.life / sp.maxLife;
    let alpha = lr < 0.1 ? lr / 0.1 : lr > 0.7 ? (1 - lr) / 0.3 : 1;
    alpha *= 0.25 + 0.15 * Math.sin(t * 0.003 + i * 2);

    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha})`;
    ctx.fill();

    if (sp.sz > 0.8) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.sz * 3, 0, TWO_PI);
      ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha * 0.12})`;
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

SCENES.mycelium = { init: initMycelium, draw: drawMycelium };
