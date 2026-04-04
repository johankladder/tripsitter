// ══════════════════════════════════════════════════════
// MOODS (color palettes)
// ══════════════════════════════════════════════════════
const TWO_PI = Math.PI * 2;

const MOODS = {
  ocean: {
    bg: [5, 8, 25],
    colors: [[40,100,160],[70,160,180],[20,60,120],[100,180,200],[30,80,140],[60,140,170]],
    particleColor: [140, 200, 230], speed: 0.6,
  },
  aurora: {
    bg: [8, 12, 20],
    colors: [[60,200,140],[40,100,180],[80,230,160],[50,140,200],[100,220,180],[30,80,150]],
    particleColor: [160, 240, 200], speed: 0.5,
  },
  ember: {
    bg: [20, 8, 5],
    colors: [[200,120,50],[180,70,40],[220,160,60],[160,60,40],[230,140,70],[140,50,30]],
    particleColor: [255, 200, 140], speed: 0.45,
  },
  dream: {
    bg: [12, 5, 20],
    colors: [[160,100,220],[100,60,180],[200,140,240],[80,50,160],[180,120,230],[120,70,200]],
    particleColor: [210, 170, 255], speed: 0.5,
  },
  forest: {
    bg: [5, 15, 10],
    colors: [[60,160,80],[40,120,70],[80,180,100],[30,100,60],[100,200,120],[50,140,80]],
    particleColor: [150, 220, 170], speed: 0.4,
  },
  sunset: {
    bg: [20, 8, 12],
    colors: [[220,100,60],[240,160,80],[200,60,80],[255,180,100],[180,50,70],[230,130,50]],
    particleColor: [255, 180, 120], speed: 0.5,
  },
  ice: {
    bg: [8, 12, 20],
    colors: [[140,200,240],[100,170,220],[180,220,250],[80,150,200],[160,210,245],[120,180,230]],
    particleColor: [200, 230, 255], speed: 0.35,
  },
  neon: {
    bg: [5, 5, 15],
    colors: [[255,50,150],[50,200,255],[255,200,50],[150,50,255],[50,255,150],[255,100,50]],
    particleColor: [255, 150, 255], speed: 0.65,
  },
  midnight: {
    bg: [3, 3, 10],
    colors: [[30,40,100],[20,30,80],[50,60,130],[15,20,70],[40,50,120],[25,35,90]],
    particleColor: [100, 120, 200], speed: 0.3,
  },
  rose: {
    bg: [18, 6, 12],
    colors: [[200,80,120],[180,60,100],[220,120,160],[160,50,90],[230,140,170],[170,70,110]],
    particleColor: [240, 170, 200], speed: 0.45,
  }
};

let currentMood = 'ocean';
let targetMood = MOODS.ocean;
const M = {
  bg: [...MOODS.ocean.bg],
  colors: MOODS.ocean.colors.map(c => [...c]),
  particleColor: [...MOODS.ocean.particleColor],
  speed: MOODS.ocean.speed
};

function lerpC(a, b, t) {
  a[0] += (b[0] - a[0]) * t;
  a[1] += (b[1] - a[1]) * t;
  a[2] += (b[2] - a[2]) * t;
  return a;
}

// Pre-allocated arrays for rounded color values — avoids .map(Math.round) allocations in hot loops
const _rc = [0, 0, 0];
const _rcColors = Array.from({ length: 6 }, () => [0, 0, 0]);
const _rcParticle = [0, 0, 0];
let _bgFillStyle = '';
let _bgR = -1, _bgG = -1, _bgB = -1;

function cacheRoundedColors() {
  for (let i = 0; i < 6; i++) {
    _rcColors[i][0] = M.colors[i][0] | 0;
    _rcColors[i][1] = M.colors[i][1] | 0;
    _rcColors[i][2] = M.colors[i][2] | 0;
  }
  _rcParticle[0] = M.particleColor[0] | 0;
  _rcParticle[1] = M.particleColor[1] | 0;
  _rcParticle[2] = M.particleColor[2] | 0;
}

function updateMoodLerp() {
  const s = 0.018;
  M.bg = lerpC(M.bg, targetMood.bg, s);
  M.particleColor = lerpC(M.particleColor, targetMood.particleColor, s);
  for (let i = 0; i < 6; i++) M.colors[i] = lerpC(M.colors[i], targetMood.colors[i], s);
  M.speed += (targetMood.speed - M.speed) * s;
}


// ══════════════════════════════════════════════════════
// CANVAS
// ══════════════════════════════════════════════════════
const canvas = document.getElementById('main');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  const dpr = window._castReceiver ? 1 : (devicePixelRatio || 1);
  W = canvas.width = window.innerWidth * dpr;
  H = canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}
resize();
let _resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    canvas.width = 0;
    resize();
    initCurrentScene();
  }, 150);
});

// ══════════════════════════════════════════════════════
// SIMPLEX-LIKE NOISE
// ══════════════════════════════════════════════════════
const perm = new Uint8Array(512);
const grad3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
];
(function () {
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function noise2D(x, y) {
  const s = (x + y) * F2;
  let i = Math.floor(x + s), j = Math.floor(y + s);
  const t = (i + j) * G2;
  const X0 = i - t, Y0 = j - t;
  const x0 = x - X0, y0 = y - Y0;
  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  i &= 255; j &= 255;
  const gi0 = perm[i + perm[j]] % 12;
  const gi1 = perm[i + i1 + perm[j + j1]] % 12;
  const gi2 = perm[i + 1 + perm[j + 1]] % 12;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0); }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1); }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2); }
  return 70 * (n0 + n1 + n2);
}

// ══════════════════════════════════════════════════════
// SCENE REGISTRY — populated by scenes/*.js
// ══════════════════════════════════════════════════════
const SCENES = {};

// ══════════════════════════════════════════════════════
// SCENE MANAGEMENT
// ══════════════════════════════════════════════════════
let currentScene = 'deep';
let sceneAlpha = 1;
let fadingOut = false;
let nextScene = null;

function initCurrentScene() { SCENES[currentScene].init(); }

function switchScene(name) {
  if (name === currentScene) return;
  nextScene = name;
  fadingOut = true;
}

// ══════════════════════════════════════════════════════
// AUTO MODE (cycles moods and scenes)
// ══════════════════════════════════════════════════════
let autoMood = false;
let autoMoodTimer = 0;
let autoSceneTimer = 0;
const AUTO_MOOD_INTERVAL = 30000;
const AUTO_SCENE_INTERVAL = 90000;
const moodKeys = Object.keys(MOODS);
const sceneKeys = ['deep', 'mandala', 'cosmos', 'liquid', 'waves', 'kaleido', 'fireflies', 'spiral', 'rain', 'ink', 'mycelium', 'threads'];
const _moodBtns = document.querySelectorAll('.mood-btn');
const _sceneBtns = document.querySelectorAll('.scene-btn');

function pickRandom(arr, exclude) {
  let pick;
  do { pick = arr[Math.floor(Math.random() * arr.length)]; } while (pick === exclude && arr.length > 1);
  return pick;
}

function toggleAutoMood() {
  autoMood = !autoMood;
  autoMoodTimer = 0;
  autoSceneTimer = 0;
  const btn = document.getElementById('autoMoodBtn');
  if (btn) btn.classList.toggle('active', autoMood);
}

function updateAutoMood(dt) {
  if (!autoMood) return;
  autoMoodTimer += dt;
  autoSceneTimer += dt;

  // Random mood change
  if (autoMoodTimer >= AUTO_MOOD_INTERVAL) {
    autoMoodTimer = 0;
    const name = pickRandom(moodKeys, currentMood);
    targetMood = MOODS[name];
    currentMood = name;
    _moodBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.mood === name);
    });
  }

  // Random scene change
  if (autoSceneTimer >= AUTO_SCENE_INTERVAL) {
    autoSceneTimer = 0;
    const sceneName = pickRandom(sceneKeys, currentScene);
    switchScene(sceneName);
    _sceneBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.scene === sceneName);
    });
  }
}

// ══════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════
let lastTime = 0, globalTime = 0, started = false, sceneInitPending = false;

function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  globalTime += dt;

  updateMoodLerp();
  cacheRoundedColors();
  updateAutoMood(dt);

  // Background — only rebuild fillStyle string when color actually changes
  const br = M.bg[0] | 0, bg2 = M.bg[1] | 0, bb = M.bg[2] | 0;
  if (br !== _bgR || bg2 !== _bgG || bb !== _bgB) {
    _bgR = br; _bgG = bg2; _bgB = bb;
    _bgFillStyle = `rgb(${br},${bg2},${bb})`;
  }
  ctx.fillStyle = _bgFillStyle;
  ctx.fillRect(0, 0, W, H);

  if (appMode === 'interactive') {
    // Interactive mode — symbiosis draws on top of background
    if (typeof drawSymbiosis === 'function') drawSymbiosis(globalTime, dt);
  } else if (appMode === 'garden') {
    // Garden mode — grid planting
    if (typeof drawGarden === 'function') drawGarden(globalTime, dt);
  } else {
    // Ambient mode — scene crossfade
    if (fadingOut) {
      sceneAlpha -= dt * 0.002;
      if (sceneAlpha <= 0) {
        sceneAlpha = 0;
        currentScene = nextScene;
        fadingOut = false;
        nextScene = null;
        sceneInitPending = true;
      }
    } else if (sceneInitPending) {
      SCENES[currentScene].init();
      sceneInitPending = false;
    } else if (sceneAlpha < 1) {
      sceneAlpha += dt * 0.002;
      if (sceneAlpha > 1) sceneAlpha = 1;
    }

    ctx.save();
    ctx.globalAlpha = sceneAlpha;
    SCENES[currentScene].draw(globalTime, dt);
    ctx.restore();
  }

  requestAnimationFrame(animate);
}

// ══════════════════════════════════════════════════════
// UI & EVENTS
// ══════════════════════════════════════════════════════

// Cursor glow
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow) {
  document.addEventListener('mousemove', e => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
  });
}

// Auto-hide UI
let uiTimeout;
function showUI() {
  if (!started) return;
  document.body.classList.add('show-ui');
  clearTimeout(uiTimeout);
  uiTimeout = setTimeout(() => document.body.classList.remove('show-ui'), 4000);
}
document.addEventListener('mousemove', showUI);
document.addEventListener('touchstart', showUI);

// Mood buttons
_moodBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    _moodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    targetMood = MOODS[btn.dataset.mood];
  });
});

// Scene buttons
_sceneBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    _sceneBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchScene(btn.dataset.scene);
  });
});

// Mode buttons (sender panel)
document.querySelectorAll('.mode-ctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchToMode(btn.dataset.mode);
    if (typeof sendCastMessage === 'function') sendCastMessage({ mode: btn.dataset.mode });
  });
});

// Fullscreen
const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) {
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  });
}

// ══════════════════════════════════════════════════════
// MODE (ambient or interactive)
// ══════════════════════════════════════════════════════
let appMode = 'ambient'; // 'ambient', 'interactive', or 'garden'

function setPanelVisible(show) {
  const panel = document.querySelector('.panel');
  if (panel) panel.classList.toggle('panel-hidden', !show);
}

function startWithMode(mode) {
  appMode = mode;
  const overlay = document.getElementById('titleOverlay');
  if (overlay) overlay.classList.add('hidden');
  started = true;
  const controls = document.querySelector('.controls');
  if (controls) controls.style.display = '';
  setPanelVisible(mode === 'ambient');
  if (mode === 'interactive' && typeof initSymbiosis === 'function') {
    initSymbiosis();
  } else if (mode === 'garden' && typeof initGarden === 'function') {
    initGarden();
  }
}

function switchToMode(mode) {
  if (mode === appMode && started) return;

  // Clean up current mode
  if (appMode === 'interactive' && typeof organisms !== 'undefined' && organisms[0]) {
    organisms[0] = null;
    organisms[1] = null;
    symbSpores.length = 0;
    symbMergeZones.length = 0;
  }
  if (appMode === 'garden' && typeof gardenGrid !== 'undefined') {
    gardenGrid = [];
    gardenSpores = [];
  }

  // Start new mode
  appMode = mode;
  const overlay = document.getElementById('titleOverlay');
  if (overlay) overlay.classList.add('hidden');
  started = true;

  const controls = document.querySelector('.controls');
  if (controls) controls.style.display = '';
  setPanelVisible(mode === 'ambient');
  if (mode === 'interactive' && typeof initSymbiosis === 'function') {
    initSymbiosis();
  } else if (mode === 'garden' && typeof initGarden === 'function') {
    initGarden();
  }

  // Update mode buttons
  const modeBtns = document.querySelectorAll('.mode-ctrl-btn');
  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
}

function returnToSplash() {
  started = false;
  appMode = 'ambient';
  setPanelVisible(true);
  const overlay = document.getElementById('titleOverlay');
  if (overlay) overlay.classList.remove('hidden');
  // Clean up symbiosis state
  if (typeof organisms !== 'undefined' && organisms[0]) {
    organisms[0] = null;
    organisms[1] = null;
    symbSpores.length = 0;
    symbMergeZones.length = 0;
  }
  // Clean up garden state
  if (typeof gardenGrid !== 'undefined') {
    gardenGrid = [];
    gardenSpores = [];
  }
  const controls = document.querySelector('.controls');
  if (controls) controls.style.display = 'none';
}

// Splash screen — wire up mode selection
function initSplash() {
  const isReceiver = window._castReceiver;
  const modeBtns = document.querySelectorAll('.mode-btn');
  let selectedMode = 'ambient';

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!started) {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMode = btn.dataset.mode;
        if (!isReceiver) startWithMode(selectedMode);
      }
    });
  });

  if (isReceiver) {
    const splashModes = ['ambient', 'interactive', 'garden'];
    document.addEventListener('keydown', (e) => {
      if (started) return;
      if (e.keyCode === 37 || e.keyCode === 39) {
        const dir = e.keyCode === 39 ? 1 : -1;
        const idx = splashModes.indexOf(selectedMode);
        selectedMode = splashModes[(idx + dir + splashModes.length) % splashModes.length];
        modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === selectedMode));
      } else if (e.keyCode === 13) {
        startWithMode(selectedMode);
      }
    });
  }
}

// If splash is already inlined (receiver), wire it up directly.
// Otherwise fetch it (sender).
if (document.getElementById('titleOverlay')) {
  initSplash();
} else {
  fetch('splash.html')
    .then(r => r.text())
    .then(html => {
      document.body.insertAdjacentHTML('beforeend', html);
      const subtitle = document.getElementById('splashSubtitle');
      if (subtitle) subtitle.textContent = 'select a mode to begin';
      initSplash();
    });
}

// Sender: keyboard + touch support for interactive modes
if (!window._castReceiver) {
  document.addEventListener('keydown', (e) => {
    if (!started) return;
    if (appMode === 'interactive') {
      switch (e.key) {
        case 'ArrowLeft': symbInput.feedA = true; break;
        case 'ArrowRight': symbInput.feedB = true; break;
        case 'ArrowUp': symbInput.shiftUp = true; break;
        case 'ArrowDown': symbInput.shiftDown = true; break;
        case ' ':
        case 'Enter': if (!e.repeat) symbInput.bloom = true; break;
      }
    } else if (appMode === 'garden') {
      switch (e.key) {
        case 'ArrowLeft': gardenInput.left = true; break;
        case 'ArrowRight': gardenInput.right = true; break;
        case 'ArrowUp': gardenInput.up = true; break;
        case 'ArrowDown': gardenInput.down = true; break;
        case ' ':
        case 'Enter': if (!e.repeat) gardenInput.plant = true; break;
      }
    }
  });

  // Touch/click: tap left half feeds A, right half feeds B, double-tap blooms
  let lastTapTime = 0;
  function handleSymbTap(x) {
    if (!started || appMode !== 'interactive') return;
    const now = Date.now();
    if (now - lastTapTime < 300) {
      // Double-tap — bloom
      symbInput.bloom = true;
      lastTapTime = 0;
    } else {
      // Single tap — feed left or right organism
      if (x < W / 2) symbInput.feedA = true;
      else symbInput.feedB = true;
      lastTapTime = now;
    }
  }

  // Swipe detection for color shift
  let touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (!started) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', (e) => {
    if (!started) return;
    const touch = e.changedTouches[0];
    const dy = touchStartY - touch.clientY;
    if (appMode === 'interactive') {
      if (Math.abs(dy) > 50) {
        if (dy > 0) symbInput.shiftUp = true;
        else symbInput.shiftDown = true;
      } else {
        handleSymbTap(touch.clientX);
      }
    } else if (appMode === 'garden') {
      handleGardenTap(touch.clientX, touch.clientY);
    }
  });

  canvas.addEventListener('click', (e) => {
    if (!started) return;
    if (appMode === 'interactive') {
      handleSymbTap(e.clientX);
    } else if (appMode === 'garden') {
      handleGardenTap(e.clientX, e.clientY);
    }
  });

  // Garden: tap to move cursor and plant
  function handleGardenTap(x, y) {
    if (typeof gardenOffsetX === 'undefined') return;
    const col = Math.floor((x - gardenOffsetX) / gardenCellSize);
    const row = Math.floor((y - gardenOffsetY) / gardenCellSize);
    if (col >= 0 && col < gardenCols && row >= 0 && row < gardenRows) {
      gardenCursorX = col;
      gardenCursorY = row;
      gardenInput.plant = true;
    }
  }
}
