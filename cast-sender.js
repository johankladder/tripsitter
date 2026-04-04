// ══════════════════════════════════════════════════════
// CHROMECAST SENDER
// ══════════════════════════════════════════════════════
const CAST_APP_ID = 'C9DEE96B';
const CAST_CHANNEL = 'urn:x-cast:tripsitter';

let castSession = null;

window['__onGCastApiAvailable'] = function (isAvailable) {
  console.log('Cast API available:', isAvailable);
  if (!isAvailable) {
    console.log('Cast API not available');
    return;
  }

  console.log('Initializing Cast...');
  console.log('cast:', typeof cast);
  console.log('chrome.cast:', typeof chrome.cast);

  cast.framework.CastContext.getInstance().setOptions({
    receiverApplicationId: CAST_APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  const castBtn = document.getElementById('castBtn');
  castBtn.style.display = '';

  // Show splash cast button too (if splash is loaded)
  function showSplashCastBtn() {
    const splashCastBtn = document.getElementById('splashCastBtn');
    if (splashCastBtn) {
      splashCastBtn.style.display = '';
      splashCastBtn.addEventListener('click', () => {
        cast.framework.CastContext.getInstance().requestSession();
      });
    }
  }
  showSplashCastBtn();
  // Also try after splash loads (it's fetched async)
  const observer = new MutationObserver(() => {
    if (document.getElementById('splashCastBtn')) {
      showSplashCastBtn();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Listen for messages from the receiver (two-way sync)
  function onReceiverMessage(namespace, message) {
    const data = typeof message === 'string' ? JSON.parse(message) : message;
    if (data.scene) {
      const btn = document.querySelector(`.scene-btn[data-scene="${data.scene}"]`);
      if (btn) {
        document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        switchScene(data.scene);
      }
    }
    if (data.mood) {
      const btn = document.querySelector(`.mood-btn[data-mood="${data.mood}"]`);
      if (btn) {
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        targetMood = MOODS[data.mood];
        currentMood = data.mood;
      }
    }
    if (data.autoMood !== undefined) {
      autoMood = data.autoMood;
      const autoBtn = document.getElementById('autoMoodBtn');
      if (autoBtn) autoBtn.classList.toggle('active', autoMood);
    }
    if (data.mode) {
      switchToMode(data.mode);
    }
  }

  // Listen for session changes
  cast.framework.CastContext.getInstance().addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    (event) => {
      if (event.sessionState === cast.framework.SessionState.SESSION_STARTED ||
          event.sessionState === cast.framework.SessionState.SESSION_RESUMED) {
        castSession = cast.framework.CastContext.getInstance().getCurrentSession();
        castSession.addMessageListener(CAST_CHANNEL, onReceiverMessage);
        castBtn.classList.add('active');
        document.body.classList.add('casting');
        sendCastMessage({ scene: currentScene, mood: currentMood });
      } else if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
        castSession = null;
        castBtn.classList.remove('active');
        document.body.classList.remove('casting');
      }
    }
  );

  // Cast button click
  castBtn.addEventListener('click', () => {
    if (castSession) {
      castSession.endSession(true);
    } else {
      cast.framework.CastContext.getInstance().requestSession();
    }
  });
};

function sendCastMessage(data) {
  if (castSession) {
    castSession.sendMessage(CAST_CHANNEL, data).catch(() => {});
  }
}

// Hook into existing scene/mood buttons to also send to Chromecast
document.querySelectorAll('.scene-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendCastMessage({ scene: btn.dataset.scene });
  });
});

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendCastMessage({ mood: btn.dataset.mood });
  });
});

// Wrap toggleAutoMood to also sync to Chromecast
const _origToggleAutoMood = toggleAutoMood;
toggleAutoMood = function () {
  _origToggleAutoMood();
  sendCastMessage({ autoMood: autoMood });
};
