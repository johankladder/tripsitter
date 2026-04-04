// ══════════════════════════════════════════════════════
// GARDEN (grid game mode)
// Move a cursor on a grid, plant seeds that bloom,
// spread tendrils to neighbors, and burst into spores.
// No goals, no fail state — just grow things.
// ══════════════════════════════════════════════════════

const gardenInput = { up: false, down: false, left: false, right: false, plant: false };

let gardenGrid = [];
let gardenCols = 0;
let gardenRows = 0;
let gardenCellSize = 0;
let gardenCursorX = 0;
let gardenCursorY = 0;
let gardenOffsetX = 0;
let gardenOffsetY = 0;
let gardenSpores = [];
const GARDEN_MAX_SPORES = 80;
const GARDEN_TENDRIL_SPEED = 0.0008;
const GARDEN_BLOOM_LIFESPAN = 25000; // ms before a bloom starts fading
const GARDEN_DECAY_DURATION = 12000; // ms to fade out completely

function initGarden() {
  const controls = document.querySelector('.controls');
  if (controls) controls.style.display = 'none';

  // Calculate grid dimensions to fill screen nicely
  // Aim for cells around 60-80px so it feels spacious on a TV
  gardenCellSize = Math.round(Math.min(W, H) / 10);
  if (gardenCellSize < 50) gardenCellSize = 50;
  if (gardenCellSize > 90) gardenCellSize = 90;

  gardenCols = Math.floor(W / gardenCellSize);
  gardenRows = Math.floor(H / gardenCellSize);

  // Center the grid
  gardenOffsetX = (W - gardenCols * gardenCellSize) / 2;
  gardenOffsetY = (H - gardenRows * gardenCellSize) / 2;

  // Init empty grid
  gardenGrid = [];
  for (let r = 0; r < gardenRows; r++) {
    gardenGrid[r] = [];
    for (let c = 0; c < gardenCols; c++) {
      gardenGrid[r][c] = {
        state: 'empty', // 'empty', 'seed', 'growing', 'bloomed', 'decaying'
        plantTime: 0,
        bloomPhase: Math.random() * TWO_PI,
        ci: 0, // color index
        growProgress: 0, // 0 to 1
        tendrils: [], // connections to neighbors [{dx, dy, progress}]
        sporeTimer: 0,
        pulseOffset: Math.random() * TWO_PI,
        bloomLife: 0, // time spent fully bloomed
        decayProgress: 0, // 0 to 1, how far through dying
      };
    }
  }

  // Start cursor in center
  gardenCursorX = Math.floor(gardenCols / 2);
  gardenCursorY = Math.floor(gardenRows / 2);

  gardenSpores = [];
}

function gardenCellCenter(col, row) {
  return {
    x: gardenOffsetX + col * gardenCellSize + gardenCellSize / 2,
    y: gardenOffsetY + row * gardenCellSize + gardenCellSize / 2,
  };
}

function gardenPlant(col, row) {
  const cell = gardenGrid[row][col];
  if (cell.state === 'empty') {
    // Plant a new seed
    cell.state = 'seed';
    cell.plantTime = globalTime;
    cell.ci = Math.floor(Math.random() * 6);
    cell.growProgress = 0;
    cell.tendrils = [];
    cell.sporeTimer = 0;
    cell.bloomLife = 0;
    cell.decayProgress = 0;
  } else if (cell.state === 'bloomed') {
    // Trigger spore burst on already-bloomed cell
    gardenBurst(col, row);
  } else if (cell.state === 'decaying') {
    // Revive a dying cell — replant it back to bloomed
    cell.state = 'bloomed';
    cell.bloomLife = 0;
    cell.decayProgress = 0;
    cell.sporeTimer = 0;
  }
}

function gardenBurst(col, row) {
  const pos = gardenCellCenter(col, row);
  const cell = gardenGrid[row][col];
  const count = 10 + Math.floor(Math.random() * 10);

  for (let i = 0; i < count && gardenSpores.length < GARDEN_MAX_SPORES; i++) {
    const angle = Math.random() * TWO_PI;
    const speed = 0.4 + Math.random() * 1.2;
    gardenSpores.push({
      x: pos.x, y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      sz: 1 + Math.random() * 2.5,
      life: 0,
      maxLife: 3000 + Math.random() * 5000,
      ci: cell.ci,
      drift: Math.random() * TWO_PI,
    });
  }

  // Chance to seed empty neighbors
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
  for (let i = 0; i < dirs.length; i++) {
    const nc = col + dirs[i][0];
    const nr = row + dirs[i][1];
    if (nc >= 0 && nc < gardenCols && nr >= 0 && nr < gardenRows) {
      if (gardenGrid[nr][nc].state === 'empty' && Math.random() < 0.35) {
        gardenGrid[nr][nc].state = 'seed';
        gardenGrid[nr][nc].plantTime = globalTime + Math.random() * 800;
        gardenGrid[nr][nc].ci = Math.random() < 0.7 ? cell.ci : Math.floor(Math.random() * 6);
        gardenGrid[nr][nc].growProgress = 0;
        gardenGrid[nr][nc].tendrils = [];
        gardenGrid[nr][nc].sporeTimer = 0;
      }
    }
  }
}

function drawGarden(t, dt) {
  // ── INPUT ──
  if (gardenInput.up) { gardenCursorY = Math.max(0, gardenCursorY - 1); gardenInput.up = false; }
  if (gardenInput.down) { gardenCursorY = Math.min(gardenRows - 1, gardenCursorY + 1); gardenInput.down = false; }
  if (gardenInput.left) { gardenCursorX = Math.max(0, gardenCursorX - 1); gardenInput.left = false; }
  if (gardenInput.right) { gardenCursorX = Math.min(gardenCols - 1, gardenCursorX + 1); gardenInput.right = false; }
  if (gardenInput.plant) {
    gardenPlant(gardenCursorX, gardenCursorY);
    gardenInput.plant = false;
  }

  // ── UPDATE CELLS ──
  for (let r = 0; r < gardenRows; r++) {
    for (let c = 0; c < gardenCols; c++) {
      const cell = gardenGrid[r][c];

      if (cell.state === 'seed') {
        // Seeds grow into blooms
        cell.growProgress += dt * 0.0006 * M.speed;
        if (cell.growProgress >= 0.3 && cell.state === 'seed') {
          cell.state = 'growing';
          // Start tendrils to planted neighbors
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          for (let i = 0; i < dirs.length; i++) {
            const nc = c + dirs[i][0];
            const nr = r + dirs[i][1];
            if (nc >= 0 && nc < gardenCols && nr >= 0 && nr < gardenRows) {
              if (gardenGrid[nr][nc].state !== 'empty') {
                cell.tendrils.push({ dx: dirs[i][0], dy: dirs[i][1], progress: 0 });
              }
            }
          }
        }
      }

      if (cell.state === 'growing') {
        cell.growProgress += dt * 0.0006 * M.speed;

        // Grow tendrils
        for (let i = 0; i < cell.tendrils.length; i++) {
          cell.tendrils[i].progress = Math.min(1, cell.tendrils[i].progress + dt * GARDEN_TENDRIL_SPEED * M.speed);
        }

        // Check for new neighbors to connect to
        if (Math.random() < 0.001 * dt) {
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          for (let i = 0; i < dirs.length; i++) {
            const nc = c + dirs[i][0];
            const nr = r + dirs[i][1];
            if (nc >= 0 && nc < gardenCols && nr >= 0 && nr < gardenRows) {
              if (gardenGrid[nr][nc].state !== 'empty') {
                const already = cell.tendrils.some(td => td.dx === dirs[i][0] && td.dy === dirs[i][1]);
                if (!already) {
                  cell.tendrils.push({ dx: dirs[i][0], dy: dirs[i][1], progress: 0 });
                }
              }
            }
          }
        }

        if (cell.growProgress >= 1) {
          cell.state = 'bloomed';
          cell.growProgress = 1;
        }
      }

      if (cell.state === 'bloomed') {
        // Bloomed cells pulse gently
        cell.bloomPhase += dt * 0.0015;
        cell.bloomLife += dt;

        // Grow any remaining tendrils
        for (let i = 0; i < cell.tendrils.length; i++) {
          cell.tendrils[i].progress = Math.min(1, cell.tendrils[i].progress + dt * GARDEN_TENDRIL_SPEED * M.speed);
        }

        // Occasional spontaneous spore burst
        cell.sporeTimer += dt;
        if (cell.sporeTimer > 15000 + Math.random() * 20000) {
          cell.sporeTimer = 0;
          if (gardenSpores.length < GARDEN_MAX_SPORES * 0.5) {
            gardenBurst(c, r);
          }
        }

        // Start decaying after lifespan (with some randomness so they don't all die at once)
        if (cell.bloomLife > GARDEN_BLOOM_LIFESPAN + Math.sin(cell.pulseOffset * 3) * 8000) {
          cell.state = 'decaying';
          cell.decayProgress = 0;
        }
      }

      if (cell.state === 'decaying') {
        cell.bloomPhase += dt * 0.001; // slow down pulse
        cell.decayProgress += dt / GARDEN_DECAY_DURATION;

        // Tendrils retract
        for (let i = 0; i < cell.tendrils.length; i++) {
          cell.tendrils[i].progress = Math.max(0, cell.tendrils[i].progress - dt * 0.0003);
        }

        // Final breath — when fully decayed, release a small spore burst and die
        if (cell.decayProgress >= 1) {
          // Gentle farewell burst
          if (gardenSpores.length < GARDEN_MAX_SPORES) {
            const pos = gardenCellCenter(c, r);
            const count = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count && gardenSpores.length < GARDEN_MAX_SPORES; i++) {
              const angle = Math.random() * TWO_PI;
              const speed = 0.2 + Math.random() * 0.6;
              gardenSpores.push({
                x: pos.x, y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.2,
                sz: 0.5 + Math.random() * 1.5,
                life: 0,
                maxLife: 4000 + Math.random() * 4000,
                ci: cell.ci,
                drift: Math.random() * TWO_PI,
              });
            }
          }
          // Reset cell
          cell.state = 'empty';
          cell.tendrils = [];
          cell.bloomLife = 0;
          cell.decayProgress = 0;
          cell.growProgress = 0;
        }
      }
    }
  }

  // ── UPDATE SPORES ──
  for (let i = gardenSpores.length - 1; i >= 0; i--) {
    const sp = gardenSpores[i];
    sp.life += dt;
    sp.drift += 0.002 * M.speed;
    sp.vx += Math.sin(sp.drift) * 0.002;
    sp.vy += Math.cos(sp.drift * 0.7) * 0.002;
    sp.vx *= 0.998;
    sp.vy *= 0.998;
    sp.x += sp.vx * M.speed;
    sp.y += sp.vy * M.speed;
    if (sp.life > sp.maxLife) {
      gardenSpores[i] = gardenSpores[gardenSpores.length - 1];
      gardenSpores.pop();
    }
  }

  // ══════════════════════════════════════════════════════
  // DRAW
  // ══════════════════════════════════════════════════════

  // ── Draw grid lines (very subtle) ──
  ctx.strokeStyle = `rgba(${_rcParticle[0]},${_rcParticle[1]},${_rcParticle[2]},0.03)`;
  ctx.lineWidth = 1;
  for (let c = 0; c <= gardenCols; c++) {
    const x = gardenOffsetX + c * gardenCellSize;
    ctx.beginPath();
    ctx.moveTo(x, gardenOffsetY);
    ctx.lineTo(x, gardenOffsetY + gardenRows * gardenCellSize);
    ctx.stroke();
  }
  for (let r = 0; r <= gardenRows; r++) {
    const y = gardenOffsetY + r * gardenCellSize;
    ctx.beginPath();
    ctx.moveTo(gardenOffsetX, y);
    ctx.lineTo(gardenOffsetX + gardenCols * gardenCellSize, y);
    ctx.stroke();
  }

  // ── Draw tendrils between cells ──
  for (let r = 0; r < gardenRows; r++) {
    for (let c = 0; c < gardenCols; c++) {
      const cell = gardenGrid[r][c];
      if (cell.state === 'empty') continue;

      const from = gardenCellCenter(c, r);
      const col = _rcColors[cell.ci % 6];

      for (let i = 0; i < cell.tendrils.length; i++) {
        const td = cell.tendrils[i];
        if (td.progress <= 0) continue;

        const to = gardenCellCenter(c + td.dx, r + td.dy);
        const mx = from.x + (to.x - from.x) * td.progress;
        const my = from.y + (to.y - from.y) * td.progress;

        // Wavy tendril using noise
        const noiseX = noise2D(from.x * 0.01 + t * 0.0001, from.y * 0.01) * 8;
        const noiseY = noise2D(from.y * 0.01 + t * 0.0001, from.x * 0.01) * 8;
        const cpx = (from.x + mx) / 2 + noiseX;
        const cpy = (from.y + my) / 2 + noiseY;

        const fade = cell.state === 'decaying' ? 1 - cell.decayProgress : 1;
        const alpha = 0.15 * td.progress * fade;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(cpx, cpy, mx, my);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Glow pass
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.3})`;
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    }
  }

  // ── Draw cells ──
  for (let r = 0; r < gardenRows; r++) {
    for (let c = 0; c < gardenCols; c++) {
      const cell = gardenGrid[r][c];
      if (cell.state === 'empty') continue;

      const pos = gardenCellCenter(c, r);
      const col = _rcColors[cell.ci % 6];

      if (cell.state === 'seed') {
        // Small pulsing dot
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.003 + cell.pulseOffset);
        const sz = 2 + cell.growProgress * 4;
        const alpha = 0.3 + cell.growProgress * 0.3;

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, sz, 0, TWO_PI);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * pulse})`;
        ctx.fill();

        // Soft glow
        const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, sz * 4);
        grad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.3 * pulse})`);
        grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, sz * 4, 0, TWO_PI);
        ctx.fill();
      }

      if (cell.state === 'growing' || cell.state === 'bloomed' || cell.state === 'decaying') {
        const pulse = 0.7 + 0.3 * Math.sin(cell.bloomPhase + cell.pulseOffset);
        const progress = cell.growProgress;
        const maxR = gardenCellSize * 0.3;
        const sz = maxR * progress;
        const fade = cell.state === 'decaying' ? 1 - cell.decayProgress : 1;
        const alpha = (0.1 + progress * 0.2) * pulse * fade;

        // Outer haze
        const hazeR = sz + gardenCellSize * 0.2;
        const hazeGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, hazeR);
        hazeGrad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.5})`);
        hazeGrad.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.15})`);
        hazeGrad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
        ctx.fillStyle = hazeGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, hazeR, 0, TWO_PI);
        ctx.fill();

        // Core bloom
        if (cell.state === 'bloomed') {
          // Petal-like rings
          ctx.globalCompositeOperation = 'screen';
          for (let ring = 0; ring < 3; ring++) {
            const ringR = sz * (0.4 + ring * 0.3);
            const ringAlpha = alpha * (1 - ring * 0.3) * 0.6;
            const ringGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, ringR);
            ringGrad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${ringAlpha})`);
            ringGrad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
            ctx.fillStyle = ringGrad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ringR, 0, TWO_PI);
            ctx.fill();
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // Bright center dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2, 0, TWO_PI);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${0.5 * pulse})`;
        ctx.fill();
      }
    }
  }

  // ── Draw spores ──
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < gardenSpores.length; i++) {
    const sp = gardenSpores[i];
    const lr = sp.life / sp.maxLife;
    let alpha = lr < 0.1 ? lr / 0.1 : lr > 0.7 ? (1 - lr) / 0.3 : 1;
    alpha *= 0.4 + 0.2 * Math.sin(t * 0.003 + i * 2);
    const col = _rcColors[sp.ci % 6];

    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.sz, 0, TWO_PI);
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
    ctx.fill();

    if (sp.sz > 1) {
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.sz * 3, 0, TWO_PI);
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha * 0.2})`;
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // ── Draw cursor ──
  const curPos = gardenCellCenter(gardenCursorX, gardenCursorY);
  const curPulse = 0.5 + 0.5 * Math.sin(t * 0.003);
  const curAlpha = 0.15 + curPulse * 0.15;
  const curSize = gardenCellSize * 0.45;

  // Cursor glow
  const curGrad = ctx.createRadialGradient(curPos.x, curPos.y, 0, curPos.x, curPos.y, curSize);
  curGrad.addColorStop(0, `rgba(${_rcParticle[0]},${_rcParticle[1]},${_rcParticle[2]},${curAlpha})`);
  curGrad.addColorStop(0.6, `rgba(${_rcParticle[0]},${_rcParticle[1]},${_rcParticle[2]},${curAlpha * 0.3})`);
  curGrad.addColorStop(1, `rgba(${_rcParticle[0]},${_rcParticle[1]},${_rcParticle[2]},0)`);
  ctx.fillStyle = curGrad;
  ctx.beginPath();
  ctx.arc(curPos.x, curPos.y, curSize, 0, TWO_PI);
  ctx.fill();

  // Cursor ring
  ctx.beginPath();
  ctx.arc(curPos.x, curPos.y, gardenCellSize * 0.35, 0, TWO_PI);
  ctx.strokeStyle = `rgba(${_rcParticle[0]},${_rcParticle[1]},${_rcParticle[2]},${0.1 + curPulse * 0.1})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}
