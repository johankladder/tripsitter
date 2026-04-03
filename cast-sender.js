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

  // Listen for session changes
  cast.framework.CastContext.getInstance().addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    (event) => {
      if (event.sessionState === cast.framework.SessionState.SESSION_STARTED ||
          event.sessionState === cast.framework.SessionState.SESSION_RESUMED) {
        castSession = cast.framework.CastContext.getInstance().getCurrentSession();
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
