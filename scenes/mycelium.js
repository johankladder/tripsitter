// Mycelium — bioluminescent network that grows, branches, and pulses
let mycelNodes = [];
let mycelSegments = [];
let mycelPulses = [];
let mycelSpores = [];
let growTimer = 0;

const MAX_NODES = 80;
const MAX_SEGMENTS = 200;
const MAX_SPORES = 60;

function initMycelium() {
  mycelNodes = [];
  mycelSegments = [];
  mycelPulses = [];
  mycelSpores = [];
  growTimer = 0;

  // Seed 3-5 initial root nodes
  const seeds = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < seeds; i++) {
    mycelNodes.push({
      x: W * (0.2 + Math.random() * 0.6),
      y: H * (0.2 + Math.random() * 0.6),
      r: 3 + Math.random() * 4,
      ci: i % 6,
      energy: 1,
      pulsePhase: Math.random() * TWO_PI,
      connections: 0,
      born: 0
    });
  }
}

function addNode(x, y, ci, parentIdx, t) {
  if (mycelNodes.length >= MAX_NODES) return -1;
  const idx = mycelNodes.length;
  mycelNodes.push({
    x: x,
    y: y,
    r: 1.5 + Math.random() * 2.5,
    ci: ci,
    energy: 0.5 + Math.random() * 0.5,
    pulsePhase: Math.random() * TWO_PI,
    connections: 0,
    born: t
  });
  return idx;
}

function addSegment(fromIdx, toIdx, ci, t) {
  if (mycelSegments.length >= MAX_SEGMENTS) return;
  const from = mycelNodes[fromIdx];
  const to = mycelNodes[toIdx];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Generate curved control points for organic look
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const bend = (Math.random() - 0.5) * dist * 0.4;

  mycelSegments.push({
    from: fromIdx,
    to: toIdx,
    cx: mx + perpX * bend,
    cy: my + perpY * bend,
    ci: ci,
    life: 0,
    maxLife: dist * 30 + 2000,
    growProgress: 0,
    dist: dist,
    born: t
  });

  mycelNodes[fromIdx].connections++;
  mycelNodes[toIdx].connections++;
}

function firePulse(segIdx, forward, t) {
  mycelPulses.push({
    seg: segIdx,
    forward: forward,
    progress: 0,
    speed: 0.0004 + Math.random() * 0.0003,
    born: t,
    ci: mycelSegments[segIdx].ci
  });
}

function spawnSpore(x, y, ci) {
  if (mycelSpores.length >= MAX_SPORES) return;
  mycelSpores.push({
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    sz: 0.5 + Math.random() * 1.5,
    life: 0,
    maxLife: 4000 + Math.random() * 6000,
    ci: ci,
    drift: Math.random() * TWO_PI,
    driftSpeed: 0.001 + Math.random() * 0.002
  });
}

function drawMycelium(t, dt) {
  growTimer += dt;

  // ── GROWTH PHASE ──
  // Periodically attempt to grow new branches
  if (growTimer > 400 / Math.max(0.3, M.speed) && mycelNodes.length < MAX_NODES) {
    growTimer = 0;

    // Pick a random existing node to branch from
    const parentIdx = Math.floor(Math.random() * mycelNodes.length);
    const parent = mycelNodes[parentIdx];

    // Don't over-branch from one node
    if (parent.connections < 4) {
      const angle = Math.random() * TWO_PI;
      const dist = 40 + Math.random() * 100;
      const nx = parent.x + Math.cos(angle) * dist;
      const ny = parent.y + Math.sin(angle) * dist;

      // Keep within bounds with padding
      if (nx > 30 && nx < W - 30 && ny > 30 && ny < H - 30) {
        // Check not too close to existing nodes
        let tooClose = false;
        for (let i = 0; i < mycelNodes.length; i++) {
          const dx = mycelNodes[i].x - nx;
          const dy = mycelNodes[i].y - ny;
          if (Math.sqrt(dx * dx + dy * dy) < 25) {
            tooClose = true;
            // Connect to existing node instead if not already connected
            let alreadyConnected = false;
            for (let s = 0; s < mycelSegments.length; s++) {
              const seg = mycelSegments[s];
              if ((seg.from === parentIdx && seg.to === i) ||
                  (seg.from === i && seg.to === parentIdx)) {
                alreadyConnected = true;
                break;
              }
            }
            if (!alreadyConnected && i !== parentIdx && parent.connections < 4) {
              addSegment(parentIdx, i, parent.ci, t);
            }
            break;
          }
        }
        if (!tooClose) {
          const ci = Math.random() < 0.3 ? Math.floor(Math.random() * 6) : parent.ci;
          const newIdx = addNode(nx, ny, ci, parentIdx, t);
          if (newIdx >= 0) {
            addSegment(parentIdx, newIdx, ci, t);
          }
        }
      }
    }
  }

  // ── UPDATE SEGMENTS ──
  for (let i = 0; i < mycelSegments.length; i++) {
    const seg = mycelSegments[i];
    seg.life += dt;
    // Grow in over time
    if (seg.growProgress < 1) {
      seg.growProgress = Math.min(1, seg.growProgress + dt * 0.002);
    }
    // Random pulse firing
    if (Math.random() < 0.00015 * M.speed) {
      firePulse(i, Math.random() < 0.5, t);
    }
  }

  // ── UPDATE PULSES ──
  for (let i = mycelPulses.length - 1; i >= 0; i--) {
    const p = mycelPulses[i];
    p.progress += p.speed * dt * M.speed;
    if (p.progress >= 1) {
      // Pulse arrived — energize target node and spawn spore
      const seg = mycelSegments[p.seg];
      const targetIdx = p.forward ? seg.to : seg.from;
      if (targetIdx < mycelNodes.length) {
        mycelNodes[targetIdx].energy = Math.min(1.5, mycelNodes[targetIdx].energy + 0.3);
        spawnSpore(mycelNodes[targetIdx].x, mycelNodes[targetIdx].y, p.ci);
      }
      mycelPulses.splice(i, 1);
    }
  }

  // ── UPDATE SPORES ──
  for (let i = mycelSpores.length - 1; i >= 0; i--) {
    const sp = mycelSpores[i];
    sp.life += dt;
    sp.drift += sp.driftSpeed * M.speed;
    sp.vx += Math.sin(sp.drift) * 0.003;
    sp.vy += Math.cos(sp.drift * 0.7) * 0.003;
    sp.vx *= 0.995;
    sp.vy *= 0.995;
    sp.x += sp.vx * M.speed;
    sp.y += sp.vy * M.speed;
    if (sp.life > sp.maxLife) {
      mycelSpores.splice(i, 1);
    }
  }

  // ── DRAW SEGMENTS ──
  for (let i = 0; i < mycelSegments.length; i++) {
    const seg = mycelSegments[i];
    const from = mycelNodes[seg.from];
    const to = mycelNodes[seg.to];
    if (!from || !to) continue;

    const c = _rcColors[seg.ci % 6];
    const age = seg.life / seg.maxLife;
    const fadeIn = Math.min(1, seg.growProgress * 2);
    const alpha = fadeIn * (0.03 + 0.02 * Math.sin(t * 0.0003 + i));

    // Draw growing tendril as quadratic curve
    const gp = seg.growProgress;
    // Parametric point on quadratic bezier at t=gp
    const endX = (1 - gp) * (1 - gp) * from.x + 2 * (1 - gp) * gp * seg.cx + gp * gp * to.x;
    const endY = (1 - gp) * (1 - gp) * from.y + 2 * (1 - gp) * gp * seg.cy + gp * gp * to.y;

    // Main tendril
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    if (gp >= 1) {
      ctx.quadraticCurveTo(seg.cx, seg.cy, to.x, to.y);
    } else {
      // Partial curve — draw to current growth point
      const midGp = gp * 0.5;
      const midX = (1 - midGp) * (1 - midGp) * from.x + 2 * (1 - midGp) * midGp * seg.cx + midGp * midGp * to.x;
      const midY = (1 - midGp) * (1 - midGp) * from.y + 2 * (1 - midGp) * midGp * seg.cy + midGp * midGp * to.y;
      ctx.quadraticCurveTo(midX, midY, endX, endY);
    }
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Soft glow along tendril
    ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha * 0.3})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  // ── DRAW PULSES ──
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < mycelPulses.length; i++) {
    const p = mycelPulses[i];
    const seg = mycelSegments[p.seg];
    if (!seg) continue;
    const from = mycelNodes[p.forward ? seg.from : seg.to];
    const to = mycelNodes[p.forward ? seg.to : seg.from];
    if (!from || !to) continue;

    const pt = p.progress;
    // Position along the quadratic bezier
    const cx = p.forward ? seg.cx : seg.cx;
    const cy = p.forward ? seg.cy : seg.cy;
    const px = (1 - pt) * (1 - pt) * from.x + 2 * (1 - pt) * pt * cx + pt * pt * to.x;
    const py = (1 - pt) * (1 - pt) * from.y + 2 * (1 - pt) * pt * cy + pt * pt * to.y;

    const c = _rcColors[p.ci % 6];
    const intensity = Math.sin(pt * Math.PI); // Brightest in middle

    // Pulse glow
    const grad = ctx.createRadialGradient(px, py, 0, px, py, 12);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${intensity * 0.35})`);
    grad.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${intensity * 0.1})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, TWO_PI);
    ctx.fill();

    // Bright core
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${intensity * 0.6})`;
    ctx.fill();
  }

  // ── DRAW NODES ──
  for (let i = 0; i < mycelNodes.length; i++) {
    const node = mycelNodes[i];
    const c = _rcColors[node.ci % 6];

    // Decay energy over time
    node.energy *= 0.997;

    const pulse = 0.5 + 0.5 * Math.sin(t * 0.002 + node.pulsePhase);
    const brightness = (0.08 + node.energy * 0.15) * (0.7 + pulse * 0.3);

    // Outer glow
    const glowR = node.r * (4 + node.energy * 3);
    const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowR);
    grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${brightness * 0.5})`);
    grad.addColorStop(0.4, `rgba(${c[0]},${c[1]},${c[2]},${brightness * 0.15})`);
    grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(node.x, node.y, glowR, 0, TWO_PI);
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r * (0.8 + node.energy * 0.4), 0, TWO_PI);
    ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${brightness * 0.7})`;
    ctx.fill();
  }

  // ── DRAW SPORES ──
  const pc = _rcParticle;
  for (let i = 0; i < mycelSpores.length; i++) {
    const sp = mycelSpores[i];
    const lr = sp.life / sp.maxLife;
    let alpha = lr < 0.1 ? lr / 0.1 : lr > 0.7 ? (1 - lr) / 0.3 : 1;
    alpha *= 0.2 + 0.15 * Math.sin(t * 0.003 + i * 2);

    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha})`;
    ctx.fill();

    // Tiny glow
    if (sp.sz > 1) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.sz * 3, 0, TWO_PI);
      ctx.fillStyle = `rgba(${pc[0]},${pc[1]},${pc[2]},${alpha * 0.15})`;
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

SCENES.mycelium = { init: initMycelium, draw: drawMycelium };
