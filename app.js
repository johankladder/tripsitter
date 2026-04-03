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
window.addEventListener('resize', () => {
  canvas.width = 0;
  resize();
  initCurrentScene();
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
const sceneKeys = ['deep', 'mandala', 'cosmos', 'liquid', 'waves', 'kaleido', 'fireflies', 'spiral', 'rain', 'plasma', 'mycelium', 'threads'];

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
    document.querySelectorAll('.mood-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mood === name);
    });
  }

  // Random scene change
  if (autoSceneTimer >= AUTO_SCENE_INTERVAL) {
    autoSceneTimer = 0;
    const sceneName = pickRandom(sceneKeys, currentScene);
    switchScene(sceneName);
    document.querySelectorAll('.scene-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.scene === sceneName);
    });
  }
}

// ══════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════
let lastTime = 0, globalTime = 0, started = false;

function animate(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;
  globalTime += dt;

  updateMoodLerp();
  cacheRoundedColors();
  updateAutoMood(dt);

  // Background
  const [br, bg, bb] = M.bg;
  ctx.fillStyle = `rgb(${Math.round(br)},${Math.round(bg)},${Math.round(bb)})`;
  ctx.fillRect(0, 0, W, H);

  // Scene crossfade
  if (fadingOut) {
    sceneAlpha -= dt * 0.002;
    if (sceneAlpha <= 0) {
      sceneAlpha = 0;
      currentScene = nextScene;
      SCENES[currentScene].init();
      fadingOut = false;
      nextScene = null;
    }
  } else if (sceneAlpha < 1) {
    sceneAlpha += dt * 0.002;
    if (sceneAlpha > 1) sceneAlpha = 1;
  }

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  SCENES[currentScene].draw(globalTime, dt);
  ctx.restore();

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
  document.body.classList.add('show-ui');
  clearTimeout(uiTimeout);
  uiTimeout = setTimeout(() => document.body.classList.remove('show-ui'), 4000);
}
document.addEventListener('mousemove', showUI);
document.addEventListener('touchstart', showUI);

// Mood buttons
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    targetMood = MOODS[btn.dataset.mood];
  });
});

// Scene buttons
document.querySelectorAll('.scene-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    switchScene(btn.dataset.scene);
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

// Start
const titleOverlay = document.getElementById('titleOverlay');
function start() {
  if (titleOverlay) titleOverlay.classList.add('hidden');
  started = true;
}
if (titleOverlay) {
  titleOverlay.addEventListener('click', start);
  if (!window._castReceiver) {
    document.addEventListener('keydown', () => { if (!started) start(); });
  }
}
