// ══════════════════════════════════════════════════════
// SYMBIOSIS (interactive mode)
// Two organisms that grow, compete, merge, and bloom
// ══════════════════════════════════════════════════════

// Organism state
const organisms = [null, null];
const symbSpores = [];
const symbMergeZones = [];
let symbIdleTime = 0;

const SYMB_MAX_TENDRILS = 25;
const SYMB_TENDRIL_POINTS = 60;
const SYMB_GROW_SPEED = 0.04;
const SYMB_ENERGY_DECAY = 0.0001;
const SYMB_ENERGY_FEED = 0.06;
const SYMB_BLOOM_THRESHOLD = 0.7;
const SYMB_UNSTABLE_THRESHOLD = 0.95;
const SYMB_FEED_COOLDOWN = 300; // ms between feeds
const SYMB_EQUILIBRIUM_RATE = 0.00004;
const SYMB_MAX_SPORES = 60;
const SYMB_MAX_MERGE_ZONES = 20;

// Input state
const symbInput = { feedA: false, feedB: false, shiftUp: false, shiftDown: false, bloom: false };
let symbColorOffset = [0, 3]; // color index offsets for the two organisms

function createOrganism(cx, cy, colorOffset) {
  return {
    cx: cx, cy: cy,
    energy: 0.3,
    tendrils: [],
    blooms: [],
    haze: [],
    colorOffset: colorOffset,
    growTimer: 0,
    pulsePhase: Math.random() * TWO_PI,
    unstableFlicker: 0,
  };
}

function initSymbiosis() {
  // Hide ambient UI controls
  const controls = document.querySelector('.controls');
  if (controls) controls.style.display = 'none';

  organisms[0] = createOrganism(W * 0.28, H * 0.5, symbColorOffset[0]);
  organisms[1] = createOrganism(W * 0.72, H * 0.5, symbColorOffset[1]);
  symbSpores.length = 0;
  symbMergeZones.length = 0;
  symbIdleTime = 0;

  // Seed initial tendrils for each organism
  for (let oi = 0; oi < 2; oi++) {
    const org = organisms[oi];
    const seeds = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < seeds; i++) {
      const angle = (i / seeds) * TWO_PI + (Math.random() - 0.5) * 0.8;
      symbSpawnTendril(org, angle, 0);
    }
  }
}

function symbSpawnTendril(org, angle, generation) {
  if (org.tendrils.length >= SYMB_MAX_TENDRILS) return;
  const len = SYMB_TENDRIL_POINTS - generation * 12;
  if (len < 12) return;

  org.tendrils.push({
    points: [{ x: org.cx + (Math.random() - 0.5) * 15, y: org.cy + (Math.random() - 0.5) * 15 }],
    angle: angle,
    targetLen: len,
    speed: SYMB_GROW_SPEED + Math.random() * 0.015,
    ci: (org.colorOffset + Math.floor(Math.random() * 3)) % 6,
    thickness: Math.max(0.3, 2 - generation * 0.5),
    generation: generation,
    forked: false,
    forkAt: 0.3 + Math.random() * 0.35,
    wobble: Math.random() * 1000,
    alive: true,
    opacity: 1,
    fading: false,
  });
}

let symbLastFeedTime = [0, 0];

function symbFeedOrganism(index) {
  const org = organisms[index];
  if (!org) return;

  const now = performance.now();
  if (now - symbLastFeedTime[index] < SYMB_FEED_COOLDOWN) return;
  symbLastFeedTime[index] = now;

  org.energy = Math.min(1, org.energy + SYMB_ENERGY_FEED);
  symbIdleTime = 0;

  // Spawn new tendrils when fed
  if (org.tendrils.length < SYMB_MAX_TENDRILS) {
    const angle = Math.random() * TWO_PI;
    symbSpawnTendril(org, angle, 0);
  }
}

function symbTriggerBloom(index) {
  const org = organisms[index === undefined ? 0 : index];
  if (!org) return;

  // Pick any tendril with enough points
  const candidates = org.tendrils.filter(t => t.points.length > 5);
  if (candidates.length === 0) return;

  const td = candidates[Math.floor(Math.random() * candidates.length)];
  const tip = td.points[td.points.length - 1];

  // Burst of spores
  const count = 8 + Math.floor(org.energy * 12);
  for (let i = 0; i < count && symbSpores.length < SYMB_MAX_SPORES; i++) {
    const angle = Math.random() * TWO_PI;
    const speed = 0.5 + Math.random() * 1.5;
    symbSpores.push({
      x: tip.x, y: tip.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      sz: 1 + Math.random() * 2,
      life: 0,
      maxLife: 3000 + Math.random() * 4000,
      ci: td.ci,
      drift: Math.random() * TWO_PI,
    });
  }

  // Add a bloom glow
  org.blooms.push({
    x: tip.x, y: tip.y,
    r: 0, maxR: 15 + Math.random() * 20,
    ci: td.ci,
    phase: Math.random() * TWO_PI,
    pulseSpeed: 0.001 + Math.random() * 0.001,
    life: 0, maxLife: 8000,
    opacity: 1,
  });

  org.energy *= 0.7;
}

function drawSymbiosis(t, dt) {
  // ── INPUT HANDLING ──
  if (symbInput.feedA) { symbFeedOrganism(0); symbInput.feedA = false; }
  if (symbInput.feedB) { symbFeedOrganism(1); symbInput.feedB = false; }
  if (symbInput.shiftUp) {
    // Cycle to next mood
    const idx = moodKeys.indexOf(currentMood);
    const next = moodKeys[(idx + 1) % moodKeys.length];
    targetMood = MOODS[next];
    currentMood = next;
    symbInput.shiftUp = false;
  }
  if (symbInput.shiftDown) {
    // Cycle to previous mood
    const idx = moodKeys.indexOf(currentMood);
    const next = moodKeys[(idx + moodKeys.length - 1) % moodKeys.length];
    targetMood = MOODS[next];
    currentMood = next;
    symbInput.shiftDown = false;
  }
  if (symbInput.bloom) {
    // Bloom whichever organism has more energy (or both if close)
    if (Math.abs(organisms[0].energy - organisms[1].energy) < 0.1) {
      symbTriggerBloom(0);
      symbTriggerBloom(1);
    } else {
      symbTriggerBloom(organisms[0].energy > organisms[1].energy ? 0 : 1);
    }
    symbInput.bloom = false;
  }

  // ── IDLE EQUILIBRIUM ──
  symbIdleTime += dt;
  if (symbIdleTime > 3000) {
    // Slowly drift toward balance
    const avg = (organisms[0].energy + organisms[1].energy) / 2;
    const target = Math.max(0.25, Math.min(0.5, avg));
    organisms[0].energy += (target - organisms[0].energy) * SYMB_EQUILIBRIUM_RATE * dt;
    organisms[1].energy += (target - organisms[1].energy) * SYMB_EQUILIBRIUM_RATE * dt;
  }

  // ── UPDATE ORGANISMS ──
  for (let oi = 0; oi < 2; oi++) {
    const org = organisms[oi];

    // Energy decay
    org.energy = Math.max(0.05, org.energy - SYMB_ENERGY_DECAY * dt);

    // Unstable flicker when overfed — gentle ramp
    if (org.energy > SYMB_UNSTABLE_THRESHOLD) {
      org.unstableFlicker = Math.min(1, org.unstableFlicker + dt * 0.001);
    } else {
      org.unstableFlicker *= 0.98;
    }

    // Breathing pulse
    org.pulsePhase += dt * 0.001 * (0.5 + org.energy * 0.5);

    // Grow speed scales with energy
    const growMult = 0.5 + org.energy * 1.5;

    // ── GROW TENDRILS ──
    for (let i = 0; i < org.tendrils.length; i++) {
      const td = org.tendrils[i];
      if (!td.alive) continue;
      if (td.points.length >= td.targetLen) {
        td.alive = false;
        continue;
      }

      const growSteps = Math.max(1, Math.floor(td.speed * dt * M.speed * growMult));
      for (let s = 0; s < growSteps && td.points.length < td.targetLen; s++) {
        const last = td.points[td.points.length - 1];
        const noiseVal = noise2D(last.x * 0.004 + td.wobble, last.y * 0.004);
        td.angle += noiseVal * 0.12;

        // Bias: grow away from own center, slightly toward the other organism
        const other = organisms[1 - oi];
        const toCenterAngle = Math.atan2(org.cy - last.y, org.cx - last.x);
        const toOtherAngle = Math.atan2(other.cy - last.y, other.cx - last.x);
        td.angle += (toOtherAngle - td.angle) * 0.006;
        td.angle -= (toCenterAngle - td.angle) * 0.003;

        const step = 2 + Math.random() * 1.5;
        const nx = last.x + Math.cos(td.angle) * step;
        const ny = last.y + Math.sin(td.angle) * step;

        if (nx < 5 || nx > W - 5 || ny < 5 || ny > H - 5) {
          td.alive = false;
          break;
        }

        td.points.push({ x: nx, y: ny });

        // Haze at intervals
        if (td.points.length % 6 === 0) {
          org.haze.push({ x: nx, y: ny, r: 15 + Math.random() * 25, ci: td.ci, opacity: 1 });
          if (org.haze.length > 80) org.haze.shift();
        }

        // Fork
        const progress = td.points.length / td.targetLen;
        if (!td.forked && progress > td.forkAt && td.generation < 2 && org.energy > 0.3) {
          td.forked = true;
          symbSpawnTendril(org, td.angle + 0.5 + Math.random() * 0.4, td.generation + 1);
          if (Math.random() < 0.5) {
            symbSpawnTendril(org, td.angle - 0.5 - Math.random() * 0.4, td.generation + 1);
          }
        }
      }
    }

    // Lifecycle: periodically refresh
    org.growTimer += dt;
    if (org.growTimer > 12000 + (1 - org.energy) * 8000) {
      org.growTimer = 0;
      // Fade old tendrils
      for (let i = 0; i < org.tendrils.length; i++) {
        if (!org.tendrils[i].alive) org.tendrils[i].fading = true;
      }
      // New growth
      const newCount = 1 + Math.floor(org.energy * 3);
      for (let i = 0; i < newCount; i++) {
        symbSpawnTendril(org, Math.random() * TWO_PI, 0);
      }
    }

    // Fade and remove dead tendrils
    for (let i = org.tendrils.length - 1; i >= 0; i--) {
      const td = org.tendrils[i];
      if (td.fading) {
        td.opacity -= dt * 0.0003;
        if (td.opacity <= 0) { org.tendrils[i] = org.tendrils[org.tendrils.length - 1]; org.tendrils.pop(); }
      }
    }

    // Fade haze
    for (let i = org.haze.length - 1; i >= 0; i--) {
      org.haze[i].opacity -= dt * 0.00006;
      if (org.haze[i].opacity <= 0) { org.haze[i] = org.haze[org.haze.length - 1]; org.haze.pop(); }
    }

    // Fade blooms
    for (let i = org.blooms.length - 1; i >= 0; i--) {
      const b = org.blooms[i];
      b.life += dt;
      if (b.r < b.maxR) b.r += dt * 0.008;
      if (b.life > b.maxLife * 0.6) {
        b.opacity -= dt * 0.0003;
      }
      if (b.opacity <= 0 || b.life > b.maxLife) {
        org.blooms[i] = org.blooms[org.blooms.length - 1];
        org.blooms.pop();
      }
    }
  }

  // ── DETECT MERGE ZONES (where tendrils from A and B overlap) ──
  // Check a subset each frame to avoid O(n^2) every frame
  const checkLimit = 8;
  let checks = 0;
  for (let i = 0; i < organisms[0].tendrils.length && checks < checkLimit; i++) {
    const tA = organisms[0].tendrils[i];
    if (tA.points.length < 5) continue;
    const tipA = tA.points[tA.points.length - 1];

    for (let j = 0; j < organisms[1].tendrils.length && checks < checkLimit; j++) {
      const tB = organisms[1].tendrils[j];
      if (tB.points.length < 5) continue;
      const tipB = tB.points[tB.points.length - 1];

      const dx = tipA.x - tipB.x;
      const dy = tipA.y - tipB.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 60) {
        checks++;
        // Check if we already have a merge zone nearby
        let exists = false;
        const mx = (tipA.x + tipB.x) / 2;
        const my = (tipA.y + tipB.y) / 2;
        for (let k = 0; k < symbMergeZones.length; k++) {
          const mz = symbMergeZones[k];
          const mdx = mz.x - mx, mdy = mz.y - my;
          if (mdx * mdx + mdy * mdy < 3600) { exists = true; break; }
        }
        if (!exists && symbMergeZones.length < SYMB_MAX_MERGE_ZONES) {
          // Merge or compete based on energy balance
          const stronger = organisms[0].energy > organisms[1].energy ? 0 : 1;
          const diff = Math.abs(organisms[0].energy - organisms[1].energy);
          symbMergeZones.push({
            x: mx, y: my,
            ciA: tA.ci, ciB: tB.ci,
            r: 0, maxR: 25 + Math.random() * 15,
            merge: diff < 0.15, // merge if balanced, compete if not
            winner: stronger,
            life: 0, maxLife: 10000,
            opacity: 1,
          });
        }
      }
    }
  }

  // Update merge zones
  for (let i = symbMergeZones.length - 1; i >= 0; i--) {
    const mz = symbMergeZones[i];
    mz.life += dt;
    if (mz.r < mz.maxR) mz.r += dt * 0.005;
    if (mz.life > mz.maxLife * 0.5) {
      mz.opacity -= dt * 0.0002;
    }
    if (mz.opacity <= 0 || mz.life > mz.maxLife) {
      symbMergeZones[i] = symbMergeZones[symbMergeZones.length - 1];
      symbMergeZones.pop();
    }
  }

  // ── UPDATE SPORES ──
  for (let i = symbSpores.length - 1; i >= 0; i--) {
    const sp = symbSpores[i];
    sp.life += dt;
    sp.drift += 0.002 * M.speed;
    sp.vx += Math.sin(sp.drift) * 0.003;
    sp.vy -= 0.0002;
    sp.vx *= 0.997;
    sp.vy *= 0.997;
    sp.x += sp.vx * M.speed;
    sp.y += sp.vy * M.speed;
    if (sp.life > sp.maxLife) { symbSpores[i] = symbSpores[symbSpores.length - 1]; symbSpores.pop(); }
  }

  // ══════════════════════════════════════════════════════
  // DRAW
  // ══════════════════════════════════════════════════════

  // ── Draw haze (both organisms) ──
  for (let oi = 0; oi < 2; oi++) {
    const org = organisms[oi];
    for (let i = 0; i < org.haze.length; i++) {
      const h = org.haze[i];
      const c = _rcColors[h.ci % 6];
      const breath = (0.035 + 0.015 * Math.sin(t * 0.0002 + i * 0.7)) * h.opacity;
      const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
      grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${breath})`);
      grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TWO_PI);
      ctx.fill();
    }
  }

  // ── Draw tendrils (both organisms) ──
  for (let oi = 0; oi < 2; oi++) {
    const org = organisms[oi];
    const energyPulse = 0.8 + 0.2 * Math.sin(org.pulsePhase);
    const flicker = org.unstableFlicker > 0.5 ? (0.85 + 0.15 * Math.sin(t * 0.006 * org.unstableFlicker)) : 1;

    for (let i = 0; i < org.tendrils.length; i++) {
      const td = org.tendrils[i];
      if (td.points.length < 2) continue;
      const c = _rcColors[td.ci % 6];

      ctx.beginPath();
      ctx.moveTo(td.points[0].x, td.points[0].y);
      for (let j = 1; j < td.points.length - 1; j++) {
        const xc = (td.points[j].x + td.points[j + 1].x) / 2;
        const yc = (td.points[j].y + td.points[j + 1].y) / 2;
        ctx.quadraticCurveTo(td.points[j].x, td.points[j].y, xc, yc);
      }
      ctx.lineTo(td.points[td.points.length - 1].x, td.points[td.points.length - 1].y);

      const baseAlpha = (0.12 + org.energy * 0.12) * td.opacity * energyPulse * flicker;
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${baseAlpha})`;
      ctx.lineWidth = td.thickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Glow pass
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${baseAlpha * 0.4})`;
      ctx.lineWidth = td.thickness * 5;
      ctx.stroke();

      // Growing tip glow
      if (td.alive) {
        const tip = td.points[td.points.length - 1];
        const tipGrad = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 12);
        tipGrad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.35 * org.energy * flicker})`);
        tipGrad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = tipGrad;
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 16, 0, TWO_PI);
        ctx.fill();
      }
    }

    // ── Draw core glow at organism center ──
    const coreR = 35 + org.energy * 50;
    const coreAlpha = (0.1 + org.energy * 0.15) * energyPulse * flicker;
    const ci = org.colorOffset % 6;
    const cc = _rcColors[ci];
    const coreGrad = ctx.createRadialGradient(org.cx, org.cy, 0, org.cx, org.cy, coreR);
    coreGrad.addColorStop(0, `rgba(${cc[0]},${cc[1]},${cc[2]},${coreAlpha})`);
    coreGrad.addColorStop(0.4, `rgba(${cc[0]},${cc[1]},${cc[2]},${coreAlpha * 0.4})`);
    coreGrad.addColorStop(1, `rgba(${cc[0]},${cc[1]},${cc[2]},0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(org.cx, org.cy, coreR, 0, TWO_PI);
    ctx.fill();
  }

  // ── Draw merge zones ──
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < symbMergeZones.length; i++) {
    const mz = symbMergeZones[i];
    const cA = _rcColors[mz.ciA % 6];
    const cB = _rcColors[mz.ciB % 6];
    // Blend colors
    const mr = (cA[0] + cB[0]) / 2;
    const mg = (cA[1] + cB[1]) / 2;
    const mb = (cA[2] + cB[2]) / 2;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.002 + i);
    const alpha = 0.15 * pulse * mz.opacity;

    if (mz.merge) {
      // Harmonious blend — concentric rings
      for (let ring = 0; ring < 3; ring++) {
        const rr = mz.r * (0.4 + ring * 0.35);
        const grad = ctx.createRadialGradient(mz.x, mz.y, 0, mz.x, mz.y, rr);
        grad.addColorStop(0, `rgba(${mr|0},${mg|0},${mb|0},${alpha * (1.5 - ring * 0.4)})`);
        grad.addColorStop(1, `rgba(${mr|0},${mg|0},${mb|0},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mz.x, mz.y, rr, 0, TWO_PI);
        ctx.fill();
      }
    } else {
      // Competition — flickering, asymmetric glow favoring winner
      const wc = mz.winner === 0 ? cA : cB;
      const flick = 0.5 + 0.5 * Math.sin(t * 0.008 + i * 3);
      const grad = ctx.createRadialGradient(mz.x, mz.y, 0, mz.x, mz.y, mz.r);
      grad.addColorStop(0, `rgba(${wc[0]},${wc[1]},${wc[2]},${alpha * 1.5 * flick})`);
      grad.addColorStop(0.6, `rgba(${mr|0},${mg|0},${mb|0},${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(${mr|0},${mg|0},${mb|0},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mz.x, mz.y, mz.r, 0, TWO_PI);
      ctx.fill();
    }
  }

  // ── Draw blooms ──
  for (let oi = 0; oi < 2; oi++) {
    const org = organisms[oi];
    for (let i = 0; i < org.blooms.length; i++) {
      const b = org.blooms[i];
      const c = _rcColors[b.ci % 6];
      const pulse = 0.6 + 0.4 * Math.sin(t * b.pulseSpeed + b.phase);
      const alpha = 0.18 * pulse * b.opacity;

      for (let ring = 0; ring < 3; ring++) {
        const rr = b.r * (0.4 + ring * 0.35);
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
        grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${alpha * (1.5 - ring * 0.4)})`);
        grad.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${alpha * (0.4 - ring * 0.1)})`);
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, rr, 0, TWO_PI);
        ctx.fill();
      }

      // Bright center
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, TWO_PI);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.4 * pulse * b.opacity})`;
      ctx.fill();
    }
  }

  // ── Draw spores ──
  const pc = _rcParticle;
  for (let i = 0; i < symbSpores.length; i++) {
    const sp = symbSpores[i];
    const lr = sp.life / sp.maxLife;
    let alpha = lr < 0.1 ? lr / 0.1 : lr > 0.7 ? (1 - lr) / 0.3 : 1;
    alpha *= 0.5 + 0.2 * Math.sin(t * 0.003 + i * 2);
    const c = _rcColors[sp.ci % 6];

    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    ctx.fill();

    if (sp.sz > 1) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.sz * 3, 0, TWO_PI);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.2})`;
      ctx.fill();
    }
  }

  ctx.globalCompositeOperation = 'source-over';
}
