// Ambient generative sound engine using Web Audio API
(function () {
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let nodes = [];

  // Expose toggle globally for the UI button
  window.toggleSound = toggleSound;
  window.isSoundPlaying = () => isPlaying;

  function createAudioContext() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(audioCtx.destination);
  }

  // Create a smooth drone pad from detuned oscillators
  function createPad(freq, type, detune, gainVal) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;

    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    gain.gain.value = gainVal;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();

    return { osc, gain, filter };
  }

  // Create filtered noise for texture
  function createNoise(gainVal) {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    const gain = audioCtx.createGain();
    gain.gain.value = gainVal;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();

    return { source, gain, filter };
  }

  // Evolving LFO that modulates filter frequencies
  function createLFO(target, minVal, maxVal, rate) {
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();

    lfo.type = 'sine';
    lfo.frequency.value = rate;
    lfoGain.gain.value = (maxVal - minVal) / 2;

    lfo.connect(lfoGain);
    lfoGain.connect(target);
    target.value = (minVal + maxVal) / 2;
    lfo.start();

    return { lfo, lfoGain };
  }

  function buildSoundscape() {
    nodes = [];

    // Deep drone layer — root + fifth
    const drone1 = createPad(55, 'sine', 0, 0.12);        // A1
    const drone2 = createPad(55.5, 'sine', 7, 0.08);      // Slightly detuned
    const drone3 = createPad(82.4, 'sine', -5, 0.06);     // E2 (fifth)
    const drone4 = createPad(110, 'triangle', 3, 0.03);    // A2 overtone

    // Ethereal pad — higher, softer
    const pad1 = createPad(220, 'sine', -8, 0.015);        // A3
    const pad2 = createPad(329.6, 'sine', 5, 0.01);        // E4
    const pad3 = createPad(277.2, 'sine', -3, 0.008);      // C#4

    // Filtered noise for atmosphere
    const noise = createNoise(0.015);

    // LFOs for movement
    const lfo1 = createLFO(drone1.filter.frequency, 400, 1200, 0.03);
    const lfo2 = createLFO(pad1.filter.frequency, 600, 2000, 0.02);
    const lfo3 = createLFO(noise.filter.frequency, 200, 800, 0.05);
    const lfo4 = createLFO(pad2.gain.gain, 0.003, 0.015, 0.01);

    nodes.push(drone1, drone2, drone3, drone4, pad1, pad2, pad3, noise);
    nodes.push(lfo1, lfo2, lfo3, lfo4);
  }

  function fadeIn() {
    if (!masterGain) return;
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 4);
  }

  function fadeOut() {
    if (!masterGain) return;
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
  }

  function toggleSound() {
    if (!audioCtx) {
      createAudioContext();
      buildSoundscape();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (isPlaying) {
      fadeOut();
      isPlaying = false;
    } else {
      fadeIn();
      isPlaying = true;
    }

    // Update button state
    const btn = document.getElementById('soundBtn');
    if (btn) btn.classList.toggle('active', isPlaying);
  }

  // Auto-start sound when user taps splash screen
  const origStart = window.start;
  if (typeof origStart === 'function') {
    // Handled via the start() override below
  }

  // Hook into the start function to begin sound on first interaction
  const _origStart = start;
  start = function () {
    _origStart();
    if (!audioCtx) {
      createAudioContext();
      buildSoundscape();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!isPlaying) {
      fadeIn();
      isPlaying = true;
      const btn = document.getElementById('soundBtn');
      if (btn) btn.classList.toggle('active', isPlaying);
    }
  };
})();
