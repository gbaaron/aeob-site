/* ============================================
   AEOB — Live Page JS
   Handles: stream switcher, countdown, reactions,
   live polls, chat platform sync, viewer simulation
   ============================================ */

// ---------- Config (placeholders — swap with real IDs) ----------
const LIVE_CONFIG = {
  // When swapping to production: update these IDs
  youtubeChannelId: 'UCxxxxxxxxxxxxxxxxxxxxxx', // channel ID for live embed
  youtubeChatChannelId: 'UCxxxxxxxxxxxxxxxxxxxxxx',
  facebookPageId: 'aneternityofbasketball',
  streamyardEmbedId: '', // StreamYard gives an embed code/ID when you enable custom embed
  // Toggle this to true when you're actually live (or wire to an API later)
  isLive: false,
  // Next scheduled episode (Saturday 8PM PHT default)
  nextEpisode: getNextSaturday8PM(),
  nextEpisodeTitle: 'Ep 301: The Toyota Dynasty Revisited',
  nextEpisodeDesc: 'The crew rewinds to 1979 and the height of Toyota\'s PBA dominance.'
};

function getNextSaturday8PM() {
  const now = new Date();
  const next = new Date(now);
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
  next.setDate(now.getDate() + daysUntilSat);
  next.setHours(20, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 7);
  return next;
}

// ---------- Toast helper (fallback if main.js doesn't expose one) ----------
function liveToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---------- Stream Platform Switcher ----------
const streamTabs = document.querySelectorAll('.stream-tab');
const videoWrap = document.getElementById('liveVideoWrap');
const chatPlatformText = document.getElementById('chatPlatformText');
let currentStream = 'youtube';

function renderStream(platform) {
  if (!videoWrap) return;
  currentStream = platform;
  let html = '';
  if (platform === 'youtube') {
    html = `<iframe src="https://www.youtube.com/embed/live_stream?channel=${LIVE_CONFIG.youtubeChannelId}&autoplay=1" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    if (chatPlatformText) chatPlatformText.textContent = 'Showing YouTube Live Chat';
  } else if (platform === 'facebook') {
    html = `<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F${LIVE_CONFIG.facebookPageId}%2Flive%2F&show_text=false&autoplay=1" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    if (chatPlatformText) chatPlatformText.textContent = 'Showing Facebook Live Chat';
  } else if (platform === 'streamyard') {
    if (LIVE_CONFIG.streamyardEmbedId) {
      html = `<iframe src="https://streamyard.com/watch/${LIVE_CONFIG.streamyardEmbedId}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    } else {
      html = `<div class="stream-placeholder"><p>StreamYard embed ID not configured yet.</p><p class="muted-sm">Paste your StreamYard embed code into <code>LIVE_CONFIG.streamyardEmbedId</code> in live.js.</p></div>`;
    }
    if (chatPlatformText) chatPlatformText.textContent = 'Chat available on YouTube or Facebook';
  }
  videoWrap.innerHTML = html;
  renderChat(platform);
}

function renderChat(platform) {
  const chatWrap = document.getElementById('chatWrap');
  if (!chatWrap) return;
  if (!LIVE_CONFIG.isLive) return; // keep placeholder when offline
  let chatHtml = '';
  if (platform === 'youtube') {
    chatHtml = `<iframe src="https://www.youtube.com/live_chat?v=LIVE_VIDEO_ID&embed_domain=${location.hostname}" frameborder="0"></iframe>`;
  } else if (platform === 'facebook') {
    chatHtml = `<div class="chat-placeholder"><p>Facebook chat is available inside the video player above.</p></div>`;
  } else {
    chatHtml = `<div class="chat-placeholder"><p>Switch to YouTube or Facebook to see live chat.</p></div>`;
  }
  chatWrap.innerHTML = chatHtml;
}

streamTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    streamTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const platform = tab.dataset.stream;
    if (LIVE_CONFIG.isLive) {
      renderStream(platform);
    } else {
      currentStream = platform;
      if (chatPlatformText) {
        const labels = { youtube: 'YouTube', facebook: 'Facebook', streamyard: 'StreamYard' };
        chatPlatformText.textContent = `${labels[platform]} selected — chat will load when we go live`;
      }
    }
  });
});

// ---------- Live / Offline State ----------
function applyLiveState() {
  const offline = document.getElementById('liveOffline');
  const player = document.getElementById('livePlayer');
  const indicator = document.getElementById('liveIndicator');
  const statusText = document.getElementById('liveStatusText');

  if (LIVE_CONFIG.isLive) {
    if (offline) offline.style.display = 'none';
    if (player) player.style.display = 'block';
    if (indicator) indicator.classList.add('is-live');
    if (statusText) statusText.textContent = 'LIVE NOW';
    renderStream(currentStream);
  } else {
    if (offline) offline.style.display = 'flex';
    if (player) player.style.display = 'none';
    if (indicator) indicator.classList.remove('is-live');
    if (statusText) statusText.textContent = 'Offline — Next stream below';
  }

  // Populate episode info
  const titleEl = document.getElementById('liveEpisodeTitle');
  const descEl = document.getElementById('liveEpisodeDesc');
  const nextTitle = document.getElementById('nextEpisodeTitle');
  if (titleEl) titleEl.textContent = LIVE_CONFIG.nextEpisodeTitle;
  if (descEl) descEl.textContent = LIVE_CONFIG.nextEpisodeDesc;
  if (nextTitle) nextTitle.textContent = 'Next: ' + LIVE_CONFIG.nextEpisodeTitle;
}

// ---------- Countdown ----------
function updateLiveCountdown() {
  const target = LIVE_CONFIG.nextEpisode.getTime();
  const now = Date.now();
  let diff = target - now;

  if (diff <= 0) {
    // Auto-flip to live
    LIVE_CONFIG.isLive = true;
    applyLiveState();
    return;
  }

  const days = Math.floor(diff / 86400000); diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000); diff -= mins * 60000;
  const secs = Math.floor(diff / 1000);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val).padStart(2, '0'); };
  set('live-days', days);
  set('live-hours', hours);
  set('live-mins', mins);
  set('live-secs', secs);
}
setInterval(updateLiveCountdown, 1000);
updateLiveCountdown();

// ---------- Watch Party (Reminder) ----------
const watchPartyBtn = document.getElementById('watchPartyBtn');
if (watchPartyBtn) {
  watchPartyBtn.addEventListener('click', () => {
    const saved = localStorage.getItem('aeob-watchparty');
    if (saved) {
      localStorage.removeItem('aeob-watchparty');
      watchPartyBtn.innerHTML = '&#128276; Remind Me When Live';
      liveToast('Reminder cancelled');
    } else {
      localStorage.setItem('aeob-watchparty', LIVE_CONFIG.nextEpisode.toISOString());
      watchPartyBtn.innerHTML = '&#9989; Reminder Set';
      liveToast('We\'ll remind you 15 minutes before the stream');
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  });
  if (localStorage.getItem('aeob-watchparty')) {
    watchPartyBtn.innerHTML = '&#9989; Reminder Set';
  }
}

// ---------- Sidebar Tabs ----------
document.querySelectorAll('.sidebar-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const target = document.getElementById(tab.dataset.sidebar + 'Panel');
    if (target) target.classList.add('active');
  });
});

// ---------- Live Reactions ----------
document.querySelectorAll('.reaction-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const countEl = btn.querySelector('.r-count');
    if (!countEl) return;
    let count = parseInt(countEl.dataset.count || '0', 10);
    count++;
    countEl.dataset.count = count;
    countEl.textContent = count;
    btn.classList.add('reacting');
    // Floating emoji effect
    const emoji = btn.childNodes[0].textContent.trim();
    spawnFloatingReaction(emoji, btn);
    setTimeout(() => btn.classList.remove('reacting'), 400);
  });
});

function spawnFloatingReaction(emoji, btn) {
  const rect = btn.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'floating-reaction';
  el.textContent = emoji;
  el.style.left = (rect.left + rect.width / 2) + 'px';
  el.style.top = rect.top + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

// ---------- Live Polls (placeholder data) ----------
const LIVE_POLLS = [
  {
    id: 'poll-1',
    question: 'Best Crispa player of all time?',
    options: ['Atoy Co', 'Philip Cezar', 'Bogs Adornado', 'Freddie Hubalde'],
    hostPicks: { Charlie: 0, Sid: 1, Noel: 0, Jay: 2 },
    locked: false
  },
  {
    id: 'poll-2',
    question: 'Greatest PBA import ever?',
    options: ['Bobby Parks', 'Norman Black', 'Sean Chambers', 'Justin Brownlee'],
    hostPicks: { Charlie: 0, Sid: 1, Noel: 0, Jay: 3 },
    locked: false
  },
  {
    id: 'poll-3',
    question: 'Most underrated PBA champion?',
    options: ['1989 Purefoods', '1995 Alaska', '2004 FedEx', '2015 Talk N Text'],
    hostPicks: null,
    locked: true
  }
];

function renderLivePolls() {
  const list = document.getElementById('livePollsList');
  if (!list) return;
  list.innerHTML = LIVE_POLLS.map(poll => {
    if (poll.locked) {
      return `<div class="live-poll locked">
        <div class="poll-lock-icon">&#128274;</div>
        <p class="poll-question">${poll.question}</p>
        <p class="muted-sm">Unlocks when the topic comes up on the show</p>
      </div>`;
    }
    const userVote = localStorage.getItem('aeob-poll-' + poll.id);
    const totals = JSON.parse(localStorage.getItem('aeob-poll-totals-' + poll.id) || '[0,0,0,0]');
    const totalVotes = totals.reduce((a, b) => a + b, 0);

    return `<div class="live-poll">
      <p class="poll-question">${poll.question}</p>
      <div class="poll-options">
        ${poll.options.map((opt, i) => {
          const pct = totalVotes ? Math.round((totals[i] / totalVotes) * 100) : 0;
          const selected = userVote === String(i);
          const hostPickers = poll.hostPicks ? Object.entries(poll.hostPicks).filter(([h, v]) => v === i).map(([h]) => h) : [];
          return `<button class="poll-option ${selected ? 'voted' : ''}" data-poll="${poll.id}" data-opt="${i}" ${userVote !== null ? 'disabled' : ''}>
            <div class="poll-option-bar" style="width:${userVote !== null ? pct : 0}%"></div>
            <div class="poll-option-content">
              <span class="poll-option-label">${opt}</span>
              ${hostPickers.length ? `<span class="poll-host-tags">${hostPickers.map(h => `<span class="host-tag">${h}</span>`).join('')}</span>` : ''}
              ${userVote !== null ? `<span class="poll-option-pct">${pct}%</span>` : ''}
            </div>
          </button>`;
        }).join('')}
      </div>
      ${userVote !== null ? `<p class="poll-total muted-sm">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</p>` : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.poll-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const pollId = btn.dataset.poll;
      const optIdx = parseInt(btn.dataset.opt, 10);
      if (localStorage.getItem('aeob-poll-' + pollId) !== null) return;
      localStorage.setItem('aeob-poll-' + pollId, String(optIdx));
      const totals = JSON.parse(localStorage.getItem('aeob-poll-totals-' + pollId) || '[0,0,0,0]');
      totals[optIdx]++;
      localStorage.setItem('aeob-poll-totals-' + pollId, JSON.stringify(totals));
      liveToast('Vote locked in!');
      renderLivePolls();
    });
  });
}
renderLivePolls();

// ---------- Viewer Count Simulation ----------
function simulateViewers() {
  const el = document.getElementById('viewerCount');
  if (!el) return;
  const base = LIVE_CONFIG.isLive ? 340 : 12;
  const jitter = Math.floor(Math.random() * 30);
  el.textContent = base + jitter;
}
simulateViewers();
setInterval(simulateViewers, 8000);

// ---------- Upcoming Streams ----------
function renderUpcomingStreams() {
  const container = document.getElementById('upcomingStreams');
  if (!container) return;
  const upcoming = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(LIVE_CONFIG.nextEpisode);
    d.setDate(d.getDate() + i * 7);
    upcoming.push({
      date: d,
      title: i === 0 ? LIVE_CONFIG.nextEpisodeTitle : `Episode ${301 + i}`,
      topic: ['1979 Toyota Dynasty', '1985 MVP Debate', '1991 Ginebra Run', 'Fan Q&A Special'][i]
    });
  }
  container.innerHTML = upcoming.map((ep, i) => `
    <div class="upcoming-stream ${i === 0 ? 'next' : ''}">
      <div class="upcoming-date">
        <div class="upcoming-month">${ep.date.toLocaleString('en-US', { month: 'short' })}</div>
        <div class="upcoming-day">${ep.date.getDate()}</div>
      </div>
      <div class="upcoming-info">
        <h4>${ep.title}</h4>
        <p>${ep.topic}</p>
        <span class="muted-sm">${ep.date.toLocaleString('en-US', { weekday: 'long' })} &middot; ${ep.date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      ${i === 0 ? '<span class="upcoming-badge">Next Up</span>' : ''}
    </div>
  `).join('');
}
renderUpcomingStreams();

// ---------- Initialize ----------
applyLiveState();

// Sign-in shortcut in chat panel
const chatSignInBtn = document.getElementById('chatSignInBtn');
if (chatSignInBtn) {
  chatSignInBtn.addEventListener('click', () => {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.click();
  });
}
