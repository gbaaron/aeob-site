/* ============================================
   AEOB — Live Page JS
   Data source: Netlify functions backed by Airtable.
   Client polls /live-state every 3s while visible.
   ============================================ */

// ---------- Config ----------
const LIVE_CONFIG = {
  youtubeChannelId: 'UCxxxxxxxxxxxxxxxxxxxxxx',
  facebookPageId: 'aneternityofbasketball',
  isLive: false,
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

// ---------- Shared server state ----------
const LIVE_STATE = {
  session: null,        // { id, title, startedAt, streamUrl, isActive }
  polls: [],            // [{ id, question, options, results, isLocked, yourVote }]
  questions: [],        // [{ id, text, userName, userTier, likeCount, youLiked }]
  reactions: {},        // { fire: 42, goat: 7, ... }
  isAdminFromServer: false,
  lastFetched: 0,
  inFlight: false
};

// Optimistic local pending reaction bumps (decay after ~3s when server catches up)
const pendingReactionBumps = {};

// ---------- Fetch helpers ----------
function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  try {
    const token = (window.Auth && Auth.getToken && Auth.getToken()) || null;
    if (token) h['Authorization'] = 'Bearer ' + token;
  } catch {}
  return h;
}

async function fetchLiveState() {
  if (LIVE_STATE.inFlight) return;
  LIVE_STATE.inFlight = true;
  try {
    const res = await fetch('/.netlify/functions/live-state', {
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    LIVE_STATE.session = data.session || null;
    LIVE_STATE.polls = Array.isArray(data.polls) ? data.polls : [];
    LIVE_STATE.questions = Array.isArray(data.questions) ? data.questions : [];
    LIVE_STATE.reactions = data.reactions || {};
    LIVE_STATE.isAdminFromServer = !!data.isAdmin;
    LIVE_STATE.lastFetched = Date.now();
    applyServerState();
  } catch (err) {
    console.warn('[live-state]', err && err.message);
  } finally {
    LIVE_STATE.inFlight = false;
  }
}

async function postJson(path, body) {
  const res = await fetch('/.netlify/functions/' + path, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {})
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const msg = (data && data.error) || ('Request failed (' + res.status + ')');
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------- Toast helper ----------
function liveToast(msg) {
  if (window.showToast) { window.showToast(msg, 'info'); return; }
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ---------- Stream Switcher ----------
const streamTabs = document.querySelectorAll('.stream-tab');
const videoWrap = document.getElementById('liveVideoWrap');
const chatPlatformText = document.getElementById('chatPlatformText');
let currentStream = 'aeob';

function activePlaybackUrl() {
  // Active session's streamUrl wins; else fall back to admin-set localStorage draft
  if (LIVE_STATE.session && LIVE_STATE.session.streamUrl) return LIVE_STATE.session.streamUrl;
  return localStorage.getItem('aeob-playback-url') || '';
}

function renderStream(platform) {
  if (!videoWrap) return;
  currentStream = platform;
  let html = '';
  if (platform === 'aeob') {
    const url = activePlaybackUrl();
    if (url) {
      html = `<iframe src="${url}" frameborder="0" allowfullscreen allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"></iframe>`;
    } else {
      html = `<div class="stream-placeholder">
        <p><strong>AEOB native stream not configured.</strong></p>
        <p class="muted-sm">An admin needs to paste a playback URL in Polls &rsaquo; AEOB stream setup, then start a session.</p>
      </div>`;
    }
    if (chatPlatformText) chatPlatformText.textContent = 'Use the Q&A tab on the right to talk to the hosts';
  } else if (platform === 'youtube') {
    html = `<iframe src="https://www.youtube.com/embed/live_stream?channel=${LIVE_CONFIG.youtubeChannelId}&autoplay=1" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    if (chatPlatformText) chatPlatformText.textContent = 'Showing YouTube Live Chat';
  } else if (platform === 'facebook') {
    html = `<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2F${LIVE_CONFIG.facebookPageId}%2Flive%2F&show_text=false&autoplay=1" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    if (chatPlatformText) chatPlatformText.textContent = 'Showing Facebook Live Chat';
  }
  videoWrap.innerHTML = html;
  renderChat(platform);
}

function renderChat(platform) {
  const chatWrap = document.getElementById('chatWrap');
  if (!chatWrap) return;
  if (!LIVE_CONFIG.isLive) return;
  let chatHtml = '';
  if (platform === 'youtube') {
    chatHtml = `<iframe src="https://www.youtube.com/live_chat?v=LIVE_VIDEO_ID&embed_domain=${location.hostname}" frameborder="0"></iframe>`;
  } else if (platform === 'facebook') {
    chatHtml = `<div class="chat-placeholder"><p>Facebook chat is available inside the video player above.</p></div>`;
  } else {
    chatHtml = `<div class="chat-placeholder"><p>The AEOB player has no built-in chat &mdash; use the <strong>Q&amp;A</strong> tab above.</p></div>`;
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
        const labels = { youtube: 'YouTube', facebook: 'Facebook', aeob: 'AEOB native' };
        chatPlatformText.textContent = `${labels[platform] || platform} selected — chat will load when we go live`;
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

  const titleEl = document.getElementById('liveEpisodeTitle');
  const descEl = document.getElementById('liveEpisodeDesc');
  const nextTitle = document.getElementById('nextEpisodeTitle');
  const sessionTitle = LIVE_STATE.session && LIVE_STATE.session.title;
  if (titleEl) titleEl.textContent = sessionTitle || LIVE_CONFIG.nextEpisodeTitle;
  if (descEl) descEl.textContent = LIVE_CONFIG.nextEpisodeDesc;
  if (nextTitle) nextTitle.textContent = 'Next: ' + LIVE_CONFIG.nextEpisodeTitle;
}

// ---------- Countdown ----------
function updateLiveCountdown() {
  const target = LIVE_CONFIG.nextEpisode.getTime();
  const now = Date.now();
  let diff = target - now;

  if (diff <= 0) {
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

// ---------- Watch Party Reminder ----------
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

// ---------- Tier helpers ----------
const TIER_ORDER = ['Rookie', 'Veteran', 'All-Star', 'Legend'];
function tierRank(name) {
  const idx = TIER_ORDER.indexOf(name);
  return idx < 0 ? 0 : idx;
}
function currentUserTier() {
  const u = (window.Auth && Auth.getUser && Auth.getUser()) || null;
  if (!u) return null;
  return u.tier || 'Rookie';
}
function tierClass(name) {
  switch (name) {
    case 'Veteran': return 'tier-veteran';
    case 'All-Star': return 'tier-allstar';
    case 'Legend':  return 'tier-legend';
    default:        return 'tier-rookie';
  }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ---------- Reactions ----------
function applyReactionTierGates() {
  const userTier = currentUserTier();
  const userRank = userTier ? tierRank(userTier) : -1;
  const hint = document.getElementById('reactionsTierHint');
  if (hint) {
    hint.textContent = userTier ? `— you're ${userTier}` : '— sign in to unlock more';
  }
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    const needed = btn.dataset.tier || 'Rookie';
    const neededRank = tierRank(needed);
    const allowed = userRank >= 0 ? userRank >= neededRank : neededRank === 0;
    btn.classList.toggle('locked', !allowed);
    btn.setAttribute('aria-disabled', allowed ? 'false' : 'true');
    btn.title = allowed
      ? `${needed}+`
      : (userTier ? `Unlocks at ${needed} (you're ${userTier})` : `Unlocks at ${needed} — sign in to earn points`);
  });
}

function renderReactionCounts() {
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    const key = btn.dataset.reaction;
    const countEl = btn.querySelector('.r-count');
    if (!key || !countEl) return;
    const serverCount = Number(LIVE_STATE.reactions[key]) || 0;
    const pending = Number(pendingReactionBumps[key]) || 0;
    const display = serverCount + pending;
    countEl.dataset.count = display;
    countEl.textContent = display;
  });
}

document.querySelectorAll('.reaction-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (btn.classList.contains('locked')) {
      const needed = btn.dataset.tier || 'Rookie';
      liveToast(`Reach ${needed} to unlock this reaction`);
      return;
    }
    const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
    if (!user) { liveToast('Sign in to react'); return; }
    if (!LIVE_STATE.session) { liveToast('No live session yet'); return; }

    const key = btn.dataset.reaction;
    pendingReactionBumps[key] = (pendingReactionBumps[key] || 0) + 1;
    renderReactionCounts();
    btn.classList.add('reacting');
    const emoji = btn.childNodes[0].textContent.trim();
    spawnFloatingReaction(emoji, btn);
    setTimeout(() => btn.classList.remove('reacting'), 400);

    try {
      await postJson('live-reactions-send', { emoji: key });
    } catch (err) {
      pendingReactionBumps[key] = Math.max(0, (pendingReactionBumps[key] || 1) - 1);
      renderReactionCounts();
      if (err.status === 429) {
        liveToast('Slow down a little');
      } else {
        liveToast(err.message || 'Reaction failed');
      }
    } finally {
      // Decay pending bump after server has had time to reflect it
      setTimeout(() => {
        pendingReactionBumps[key] = Math.max(0, (pendingReactionBumps[key] || 1) - 1);
        renderReactionCounts();
      }, 3500);
    }
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

// ---------- Polls (rendered from server) ----------
function renderLivePolls() {
  const list = document.getElementById('livePollsList');
  if (!list) return;
  const isAdmin = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  const polls = LIVE_STATE.polls;

  if (!polls.length) {
    list.innerHTML = `<p class="muted-sm" style="text-align:center;padding:16px;">${
      LIVE_STATE.session ? (isAdmin ? 'No polls yet. Create one above.' : 'No polls yet. Check back during the show.')
                         : 'No live session yet.'
    }</p>`;
    return;
  }

  list.innerHTML = polls.map(poll => {
    const adminControls = isAdmin ? `
      <div class="poll-admin-controls">
        ${poll.isLocked
          ? `<button class="btn-chip" data-admin-action="unlock" data-poll="${poll.id}">Unlock</button>`
          : `<button class="btn-chip" data-admin-action="lock" data-poll="${poll.id}">Lock</button>`}
        <button class="btn-chip btn-chip-danger" data-admin-action="delete" data-poll="${poll.id}">Delete</button>
      </div>` : '';

    if (poll.isLocked) {
      return `<div class="live-poll locked">
        <div class="poll-lock-icon">&#128274;</div>
        <p class="poll-question">${escapeHtml(poll.question)}</p>
        <p class="muted-sm">Unlocks when the topic comes up on the show</p>
        ${adminControls}
      </div>`;
    }

    const totals = Array.isArray(poll.results) ? poll.results : poll.options.map(() => 0);
    const totalVotes = totals.reduce((a, b) => a + b, 0);
    const userVote = (typeof poll.yourVote === 'number') ? poll.yourVote : null;

    return `<div class="live-poll is-custom">
      <p class="poll-question">${escapeHtml(poll.question)}</p>
      <div class="poll-options">
        ${poll.options.map((opt, i) => {
          const pct = totalVotes ? Math.round((totals[i] / totalVotes) * 100) : 0;
          const selected = userVote === i;
          return `<button class="poll-option ${selected ? 'voted' : ''}" data-poll="${poll.id}" data-opt="${i}" ${userVote !== null ? 'disabled' : ''}>
            <div class="poll-option-bar" style="width:${userVote !== null ? pct : 0}%"></div>
            <div class="poll-option-content">
              <span class="poll-option-label">${escapeHtml(opt)}</span>
              ${userVote !== null ? `<span class="poll-option-pct">${pct}%</span>` : ''}
            </div>
          </button>`;
        }).join('')}
      </div>
      ${userVote !== null ? `<p class="poll-total muted-sm">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</p>` : ''}
      ${adminControls}
    </div>`;
  }).join('');

  list.querySelectorAll('.poll-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pollId = btn.dataset.poll;
      const optIdx = parseInt(btn.dataset.opt, 10);
      const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
      if (!user) { liveToast('Sign in to vote'); return; }
      try {
        await postJson('live-polls-vote', { pollId, optionIndex: optIdx });
        liveToast('Vote locked in!');
        fetchLiveState();
      } catch (err) {
        liveToast(err.message || 'Vote failed');
      }
    });
  });

  list.querySelectorAll('[data-admin-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const action = btn.dataset.adminAction;
      const pollId = btn.dataset.poll;
      if (action === 'delete' && !confirm('Delete this poll? Votes will be hidden.')) return;
      try {
        await postJson('live-polls-update', { pollId, action });
        liveToast(action === 'lock' ? 'Poll locked' : action === 'unlock' ? 'Poll unlocked' : 'Poll deleted');
        fetchLiveState();
      } catch (err) {
        liveToast(err.message || 'Poll action failed');
      }
    });
  });
}

// ---------- Admin: Create Poll ----------
const adminPollForm = document.getElementById('adminCreatePoll');
if (adminPollForm) {
  adminPollForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) {
      liveToast('Admin only');
      return;
    }
    const qEl = document.getElementById('newPollQ');
    const lockedEl = document.getElementById('newPollLocked');
    const msgEl = document.getElementById('adminPollMsg');
    const question = (qEl.value || '').trim();
    const options = Array.from(adminPollForm.querySelectorAll('.poll-opt-input'))
      .map(i => (i.value || '').trim())
      .filter(Boolean);

    if (!question || options.length < 2) {
      if (msgEl) { msgEl.textContent = 'Need a question and at least 2 options.'; msgEl.classList.add('is-error'); }
      return;
    }

    try {
      await postJson('live-polls-create', { question, options, isLocked: !!(lockedEl && lockedEl.checked) });
      adminPollForm.reset();
      if (msgEl) { msgEl.textContent = 'Poll published.'; msgEl.classList.remove('is-error'); setTimeout(() => { msgEl.textContent = ''; }, 2500); }
      liveToast('Poll published');
      fetchLiveState();
    } catch (err) {
      if (msgEl) { msgEl.textContent = err.message || 'Failed to create poll'; msgEl.classList.add('is-error'); }
      liveToast(err.message || 'Failed to create poll');
    }
  });
}

// ---------- Admin: Session start/end ----------
const sessionStartForm = document.getElementById('sessionStartForm');
const sessionEndBtn = document.getElementById('sessionEndBtn');

if (sessionStartForm) {
  sessionStartForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) { liveToast('Admin only'); return; }
    const titleEl = document.getElementById('sessionTitle');
    const title = (titleEl && titleEl.value || '').trim() || 'AEOB Live';
    const streamUrl = localStorage.getItem('aeob-playback-url') || '';
    try {
      await postJson('live-session-start', { title, streamUrl });
      liveToast('Session started');
      await fetchLiveState();
    } catch (err) {
      liveToast(err.message || 'Failed to start session');
    }
  });
}

if (sessionEndBtn) {
  sessionEndBtn.addEventListener('click', async () => {
    if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) { liveToast('Admin only'); return; }
    if (!confirm('End the current live session? Viewers will stop seeing live content.')) return;
    try {
      await postJson('live-session-end', {});
      liveToast('Session ended');
      await fetchLiveState();
    } catch (err) {
      liveToast(err.message || 'Failed to end session');
    }
  });
}

function updateSessionStatus() {
  const statusEl = document.getElementById('sessionStatus');
  if (statusEl) {
    if (LIVE_STATE.session) {
      statusEl.innerHTML = `<strong>Live:</strong> ${escapeHtml(LIVE_STATE.session.title)} — started ${LIVE_STATE.session.startedAt ? new Date(LIVE_STATE.session.startedAt).toLocaleTimeString() : ''}`;
      statusEl.classList.add('is-ok');
    } else {
      statusEl.textContent = 'No active session';
      statusEl.classList.remove('is-ok');
    }
  }
  const startBtn = document.getElementById('sessionStartBtn');
  if (startBtn) startBtn.textContent = LIVE_STATE.session ? 'Restart session' : 'Start live session';
  if (sessionEndBtn) sessionEndBtn.style.display = LIVE_STATE.session ? 'inline-flex' : 'none';
}

// ---------- Admin: AEOB playback URL (local draft; goes to server on session start) ----------
function getPlaybackUrl() { return localStorage.getItem('aeob-playback-url') || ''; }
function setPlaybackUrl(url) {
  if (url) localStorage.setItem('aeob-playback-url', url);
  else localStorage.removeItem('aeob-playback-url');
}

function refreshPlaybackStatus() {
  const input = document.getElementById('aeobPlaybackUrl');
  const status = document.getElementById('aeobPlaybackStatus');
  if (!input || !status) return;
  const sessionUrl = LIVE_STATE.session && LIVE_STATE.session.streamUrl;
  const localUrl = getPlaybackUrl();
  input.value = localUrl || sessionUrl || '';
  if (sessionUrl) {
    status.textContent = 'Configured (from active session)';
    status.classList.add('is-ok');
  } else if (localUrl) {
    status.textContent = 'Draft saved — will apply when you start a session';
    status.classList.remove('is-ok');
  } else {
    status.textContent = 'Not configured';
    status.classList.remove('is-ok');
  }
}

const playbackForm = document.getElementById('aeobPlaybackForm');
if (playbackForm) {
  playbackForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) { liveToast('Admin only'); return; }
    const input = document.getElementById('aeobPlaybackUrl');
    const raw = (input.value || '').trim();
    if (raw && !/^https?:\/\//i.test(raw)) { liveToast('URL must start with https://'); return; }
    setPlaybackUrl(raw);
    refreshPlaybackStatus();
    liveToast(raw ? 'Playback URL saved. Start a session to push it live.' : 'Playback URL cleared');
  });
}

// ---------- Questions / Q&A ----------
function timeAgo(iso) {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function renderQuestions() {
  const list = document.getElementById('questionsList');
  if (!list) return;
  const qs = LIVE_STATE.questions;
  const isAdmin = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());

  if (!qs.length) {
    list.innerHTML = `<p class="muted-sm" style="text-align:center;padding:16px;">${
      LIVE_STATE.session ? 'No questions yet. Be the first.' : 'No live session yet.'
    }</p>`;
    return;
  }

  // Sort: higher tier first, then newest
  const sorted = qs.slice().sort((a, b) => {
    const tr = tierRank(b.userTier) - tierRank(a.userTier);
    if (tr !== 0) return tr;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  list.innerHTML = sorted.map(q => `
    <div class="question-item ${tierClass(q.userTier)}" data-qid="${q.id}">
      <div class="question-head">
        <span class="question-author">${escapeHtml(q.userName || 'Fan')}</span>
        <span class="question-tier ${tierClass(q.userTier)}">${escapeHtml(q.userTier || 'Rookie')}</span>
        <span class="question-time muted-sm">${timeAgo(q.createdAt)}</span>
      </div>
      <p class="question-text">${escapeHtml(q.text)}</p>
      <div class="question-foot">
        <button class="question-like ${q.youLiked ? 'is-liked' : ''}" data-qid="${q.id}">&#128077; <span>${q.likeCount || 0}</span></button>
        ${isAdmin ? `<button class="question-delete" data-qid="${q.id}" title="Remove">&times;</button>` : ''}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.question-like').forEach(btn => {
    btn.addEventListener('click', async () => {
      const qid = btn.dataset.qid;
      const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
      if (!user) { liveToast('Sign in to like'); return; }
      try {
        await postJson('live-questions-like', { questionId: qid });
        fetchLiveState();
      } catch (err) {
        liveToast(err.message || 'Like failed');
      }
    });
  });

  list.querySelectorAll('.question-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) return;
      const qid = btn.dataset.qid;
      try {
        await postJson('live-questions-delete', { questionId: qid, action: 'delete' });
        liveToast('Question removed');
        fetchLiveState();
      } catch (err) {
        liveToast(err.message || 'Failed');
      }
    });
  });
}

function updateQuestionsCompose() {
  const input = document.getElementById('questionInput');
  const btn = document.getElementById('questionSubmit');
  const label = document.getElementById('questionTierLabel');
  if (!input || !btn) return;
  const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
  if (!user) {
    input.disabled = true; btn.disabled = true;
    input.placeholder = 'Sign in to ask a question';
    if (label) label.textContent = 'Sign in to post';
    return;
  }
  input.disabled = false; btn.disabled = false;
  input.placeholder = 'Drop a question for the show...';
  const tier = user.tier || 'Rookie';
  if (label) label.innerHTML = `Posting as <strong>${escapeHtml(user.name || 'Fan')}</strong> <span class="question-tier ${tierClass(tier)}">${escapeHtml(tier)}</span>`;
}

const questionSubmit = document.getElementById('questionSubmit');
if (questionSubmit) {
  questionSubmit.addEventListener('click', async () => {
    const input = document.getElementById('questionInput');
    if (!input) return;
    const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
    if (!user) { liveToast('Sign in to post'); return; }
    const text = (input.value || '').trim();
    if (!text) return;
    try {
      await postJson('live-questions-create', { text });
      input.value = '';
      liveToast('Question posted');
      fetchLiveState();
    } catch (err) {
      liveToast(err.message || 'Failed to post');
    }
  });
}

// ---------- Viewer Count (cosmetic) ----------
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

// ---------- Sign-in shortcut ----------
const chatSignInBtn = document.getElementById('chatSignInBtn');
if (chatSignInBtn) {
  chatSignInBtn.addEventListener('click', () => {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.click();
  });
}

// ---------- Apply server state ----------
function applyServerState() {
  // Go live if EITHER an active session exists OR a local playback URL is set.
  // This lets admins preview the stream even without a server session.
  const hasPlayableUrl = !!activePlaybackUrl();
  LIVE_CONFIG.isLive = hasPlayableUrl;

  applyLiveState();
  updateSessionStatus();
  refreshPlaybackStatus();
  renderReactionCounts();
  renderLivePolls();
  renderQuestions();
}

// ---------- Polling loop ----------
const POLL_INTERVAL_MS = 3000;
let pollTimer = null;

function startPolling() {
  stopPolling();
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') fetchLiveState();
  }, POLL_INTERVAL_MS);
}
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    fetchLiveState();
    startPolling();
  } else {
    stopPolling();
  }
});

// ---------- Initialize ----------
applyReactionTierGates();
applyLiveState();
updateQuestionsCompose();
updateSessionStatus();
refreshPlaybackStatus();

fetchLiveState();
startPolling();

window.addEventListener('authStateChanged', () => {
  applyReactionTierGates();
  updateQuestionsCompose();
  updateStickerPanelAuthState();
  fetchUserBalance();
  fetchLiveState();
});

/* ============================================================
   Paid Stickers — store, animations, leaderboard, admin tools
   ============================================================ */

const STICKER_STATE = {
  catalog: [],            // [{ id, name, emoji, imageUrl, cost, animation, tier, description, sortOrder }]
  adminCatalog: [],       // includes inactive
  displayedSendIds: new Set(),  // sends already animated (so polling doesn't re-play)
  topSupporters: [],
  userBalance: null,      // null until fetched
  balanceLoaded: false,
  muted: (function(){ try { return localStorage.getItem('aeob-stickers-muted') === '1'; } catch { return false; }})(),
  activeTakeover: null,
  takeoverQueue: []
};

const STICKER_ANIM_LABELS = {
  float: 'Float',
  rain: 'Rain',
  burst: 'Burst',
  takeover: 'Takeover'
};

function stickerRequestingUser() {
  return (window.Auth && Auth.getUser && Auth.getUser()) || null;
}

function stickerAffordable(cost) {
  if (STICKER_STATE.userBalance === null) return false;
  return STICKER_STATE.userBalance >= cost;
}

function stickerUserMeetsTier(requiredTier) {
  const u = stickerRequestingUser();
  const userRank = u ? tierRank(u.tier || 'Rookie') : -1;
  return userRank >= tierRank(requiredTier);
}

async function fetchStickerCatalog() {
  try {
    const res = await fetch('/.netlify/functions/stickers-list');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    STICKER_STATE.catalog = Array.isArray(data.stickers) ? data.stickers : [];
    renderStickerGrid();
    renderAdminBroadcastOptions();
  } catch (err) {
    console.warn('[stickers-list]', err && err.message);
    const grid = document.getElementById('stickerGrid');
    if (grid) grid.innerHTML = '<p class="muted-sm" style="text-align:center;padding:16px;grid-column:1/-1;">Stickers unavailable right now.</p>';
  }
}

async function fetchUserBalance() {
  const user = stickerRequestingUser();
  if (!user) {
    STICKER_STATE.userBalance = null;
    STICKER_STATE.balanceLoaded = false;
    renderStickerBalance();
    renderStickerGrid();
    return;
  }
  try {
    const res = await fetch('/.netlify/functions/rewards-balance', { headers: authHeaders() });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    STICKER_STATE.userBalance = Number(data.points) || 0;
    STICKER_STATE.balanceLoaded = true;
    renderStickerBalance();
    renderStickerGrid();
  } catch (err) {
    console.warn('[rewards-balance]', err && err.message);
  }
}

function renderStickerBalance() {
  const num = document.getElementById('stickerBalance');
  if (!num) return;
  if (STICKER_STATE.userBalance === null) {
    num.textContent = '\u2014';
  } else {
    num.textContent = STICKER_STATE.userBalance.toLocaleString();
  }
}

function updateStickerPanelAuthState() {
  const hint = document.getElementById('stickerSignInHint');
  const row = document.getElementById('stickerBalanceRow');
  const user = stickerRequestingUser();
  if (hint) hint.style.display = user ? 'none' : 'flex';
  if (row) row.style.display = user ? 'flex' : 'none';
}

function renderStickerGrid() {
  const grid = document.getElementById('stickerGrid');
  if (!grid) return;

  const list = STICKER_STATE.catalog;
  if (!list.length) {
    grid.innerHTML = '<p class="muted-sm" style="text-align:center;padding:16px;grid-column:1/-1;">No stickers yet.</p>';
    return;
  }

  const user = stickerRequestingUser();
  grid.innerHTML = list.map(s => {
    const tierOk = user ? stickerUserMeetsTier(s.tier) : false;
    const affordable = user ? stickerAffordable(s.cost) : false;
    const locked = !user || !tierOk;
    const poor = user && tierOk && !affordable;
    const classes = [
      'sticker-card',
      `sticker-card--${s.animation || 'float'}`,
      locked ? 'is-locked' : '',
      poor ? 'is-insufficient' : ''
    ].filter(Boolean).join(' ');

    let lockNote = '';
    if (!user) {
      lockNote = '<span class="sticker-lock-note">Sign in</span>';
    } else if (!tierOk) {
      lockNote = `<span class="sticker-lock-note">Unlocks at ${escapeHtml(s.tier)}</span>`;
    } else if (!affordable) {
      const need = s.cost - (STICKER_STATE.userBalance || 0);
      lockNote = `<span class="sticker-lock-note">Need ${need} more</span>`;
    }

    const visual = s.imageUrl
      ? `<img class="sticker-card-img" src="${escapeHtml(s.imageUrl)}" alt="${escapeHtml(s.name)}" loading="lazy">`
      : `<span class="sticker-card-emoji">${escapeHtml(s.emoji || '\uD83C\uDFC0')}</span>`;

    return `<button type="button" class="${classes}" data-sticker-id="${escapeHtml(s.id)}">
      <span class="sticker-tier-badge ${tierClass(s.tier)}">${escapeHtml(s.tier)}</span>
      ${visual}
      <span class="sticker-card-name">${escapeHtml(s.name)}</span>
      <span class="sticker-card-cost">${Number(s.cost).toLocaleString()}</span>
      ${lockNote}
    </button>`;
  }).join('');

  grid.querySelectorAll('.sticker-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.stickerId;
      const sticker = STICKER_STATE.catalog.find(s => s.id === id);
      if (!sticker) return;
      handleStickerCardClick(sticker);
    });
  });
}

function handleStickerCardClick(sticker) {
  const user = stickerRequestingUser();
  if (!user) {
    liveToast('Sign in to send stickers');
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.click();
    return;
  }
  if (!stickerUserMeetsTier(sticker.tier)) {
    liveToast(`Reach ${sticker.tier} to send this sticker`);
    return;
  }
  if (!stickerAffordable(sticker.cost)) {
    const need = sticker.cost - (STICKER_STATE.userBalance || 0);
    liveToast(`Need ${need} more credits`);
    return;
  }
  openStickerModal(sticker);
}

/* ---- Send-confirmation modal ---- */

let pendingStickerSend = null;

function openStickerModal(sticker) {
  pendingStickerSend = sticker;
  const overlay = document.getElementById('stickerModalOverlay');
  const preview = document.getElementById('stickerModalPreview');
  const title = document.getElementById('stickerModalTitle');
  const desc = document.getElementById('stickerModalDesc');
  const cost = document.getElementById('stickerModalCost');
  const anim = document.getElementById('stickerModalAnim');
  const bal = document.getElementById('stickerModalBalance');
  const send = document.getElementById('stickerModalSend');
  const msg = document.getElementById('stickerModalMsg');
  if (!overlay) return;

  title.textContent = sticker.name;
  desc.textContent = sticker.description || '';
  cost.textContent = `${Number(sticker.cost).toLocaleString()} credits`;
  anim.textContent = STICKER_ANIM_LABELS[sticker.animation] || sticker.animation;
  bal.textContent = (STICKER_STATE.userBalance || 0).toLocaleString();
  send.textContent = `Send for ${Number(sticker.cost).toLocaleString()} credits`;
  msg.value = '';

  preview.innerHTML = '';
  if (sticker.imageUrl) {
    const img = document.createElement('img');
    img.src = sticker.imageUrl;
    img.alt = sticker.name;
    preview.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.className = 'sticker-modal-preview-emoji';
    span.textContent = sticker.emoji || '\uD83C\uDFC0';
    preview.appendChild(span);
  }
  preview.classList.remove('sticker-modal-preview--float', 'sticker-modal-preview--rain', 'sticker-modal-preview--burst', 'sticker-modal-preview--takeover');
  preview.classList.add(`sticker-modal-preview--${sticker.animation || 'float'}`);

  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => msg.focus(), 50);
}

function closeStickerModal() {
  pendingStickerSend = null;
  const overlay = document.getElementById('stickerModalOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

(function wireStickerModal() {
  const overlay = document.getElementById('stickerModalOverlay');
  const close = document.getElementById('stickerModalClose');
  const cancel = document.getElementById('stickerModalCancel');
  const send = document.getElementById('stickerModalSend');
  if (!overlay) return;

  if (close) close.addEventListener('click', closeStickerModal);
  if (cancel) cancel.addEventListener('click', closeStickerModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeStickerModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.style.display !== 'none') closeStickerModal();
  });
  if (send) {
    send.addEventListener('click', async () => {
      if (!pendingStickerSend) return;
      const sticker = pendingStickerSend;
      const msgEl = document.getElementById('stickerModalMsg');
      const message = (msgEl && msgEl.value || '').trim();
      send.disabled = true;
      const prevBalance = STICKER_STATE.userBalance;
      // Optimistic: decrement balance immediately
      if (typeof prevBalance === 'number') {
        STICKER_STATE.userBalance = Math.max(0, prevBalance - sticker.cost);
        renderStickerBalance();
        renderStickerGrid();
      }
      try {
        const data = await postJson('stickers-send', { stickerId: sticker.id, message });
        if (typeof data.newBalance === 'number') STICKER_STATE.userBalance = data.newBalance;
        renderStickerBalance();
        renderStickerGrid();
        closeStickerModal();
        liveToast('Sticker sent! \u{1F680}');
        // Preview the animation locally right away — the polling loop will also play it once for
        // everyone else; we mark the sendId as displayed so we don't double-play.
        if (data.sendId) STICKER_STATE.displayedSendIds.add(data.sendId);
        playStickerAnimation({
          id: data.sendId || ('local-' + Date.now()),
          name: sticker.name,
          emoji: sticker.emoji,
          imageUrl: sticker.imageUrl,
          animation: sticker.animation,
          cost: sticker.cost,
          userName: (stickerRequestingUser() || {}).name || 'You',
          userTier: (stickerRequestingUser() || {}).tier || 'Rookie',
          message
        }, { local: true });
      } catch (err) {
        // Rollback
        if (typeof prevBalance === 'number') {
          STICKER_STATE.userBalance = prevBalance;
          renderStickerBalance();
          renderStickerGrid();
        }
        liveToast(err.message || 'Failed to send sticker');
      } finally {
        send.disabled = false;
      }
    });
  }
})();

/* ---- Sticker animation stage ---- */

const STAGE_BOUNDS = () => {
  const stage = document.getElementById('stickerStage');
  if (!stage) return { width: 0, height: 0 };
  const rect = stage.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
};

function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

function visualHtml(send) {
  if (send.imageUrl) {
    return `<img class="sticker-el-img" src="${escapeHtml(send.imageUrl)}" alt="">`;
  }
  return `<span class="sticker-el-emoji">${escapeHtml(send.emoji || '\uD83C\uDFC0')}</span>`;
}

function buildSenderChip(send) {
  const tierBadge = `<span class="sticker-chip-tier ${tierClass(send.userTier)}">${escapeHtml(send.userTier || 'Rookie')}</span>`;
  const msg = send.message ? `<span class="sticker-chip-msg">&ldquo;${escapeHtml(send.message)}&rdquo;</span>` : '';
  return `<div class="sticker-sender-chip ${tierClass(send.userTier)}">
    ${tierBadge}
    <span class="sticker-chip-name">${escapeHtml(send.userName || 'Fan')}</span>
    <span class="sticker-chip-action">sent <strong>${escapeHtml(send.name || 'a sticker')}</strong></span>
    ${msg}
  </div>`;
}

function spawnStickerEl(stage, send, opts) {
  const el = document.createElement('div');
  el.className = `sticker-el sticker-el--${send.animation || 'float'} sticker-el--${opts.size || 'md'}`;
  el.innerHTML = visualHtml(send);
  if (opts.x !== undefined) el.style.left = opts.x + 'px';
  if (opts.y !== undefined) el.style.top = opts.y + 'px';
  if (opts.delay) el.style.animationDelay = opts.delay + 'ms';
  if (opts.duration) el.style.animationDuration = opts.duration + 'ms';
  stage.appendChild(el);
  const lifetime = (opts.duration || 2500) + (opts.delay || 0) + 200;
  setTimeout(() => el.remove(), lifetime);
  return el;
}

function spawnSenderChip(stage, send, position, lifetimeMs) {
  const chip = document.createElement('div');
  chip.className = 'sticker-chip-wrap sticker-chip-wrap--' + (position || 'bottom');
  chip.innerHTML = buildSenderChip(send);
  stage.appendChild(chip);
  setTimeout(() => chip.classList.add('sticker-chip-out'), Math.max(300, lifetimeMs - 400));
  setTimeout(() => chip.remove(), lifetimeMs);
  return chip;
}

function playStickerAnimation(send, flags) {
  if (STICKER_STATE.muted) return;
  const stage = document.getElementById('stickerStage');
  if (!stage) return;
  const bounds = STAGE_BOUNDS();
  if (!bounds.width || !bounds.height) return;

  const reduced = prefersReducedMotion();
  const kind = send.animation || 'float';

  if (kind === 'float') {
    const x = 40 + Math.random() * (bounds.width - 120);
    spawnStickerEl(stage, send, { x, y: bounds.height - 90, size: 'md', duration: reduced ? 1400 : 2600 });
    spawnSenderChip(stage, send, 'bottom', 2600);
    return;
  }

  if (kind === 'rain') {
    const count = reduced ? 3 : 10;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * (bounds.width - 60);
      spawnStickerEl(stage, send, {
        x,
        y: -60,
        size: 'sm',
        delay: i * 120,
        duration: reduced ? 1600 : 2800 + Math.random() * 700
      });
    }
    spawnSenderChip(stage, send, 'top', 3000);
    return;
  }

  if (kind === 'burst') {
    const cx = bounds.width / 2;
    const cy = bounds.height / 2;
    spawnStickerEl(stage, send, { x: cx - 70, y: cy - 70, size: 'xl', duration: reduced ? 1400 : 2200 });
    if (!reduced) {
      const petals = 6;
      for (let i = 0; i < petals; i++) {
        const angle = (i / petals) * Math.PI * 2;
        const rx = cx + Math.cos(angle) * 130 - 30;
        const ry = cy + Math.sin(angle) * 130 - 30;
        spawnStickerEl(stage, send, { x: rx, y: ry, size: 'md', delay: 180, duration: 1700 });
      }
    }
    spawnSenderChip(stage, send, 'center', 3200);
    return;
  }

  if (kind === 'takeover') {
    // Queue if one is already playing so they don't stomp each other
    if (STICKER_STATE.activeTakeover && !flags?.local) {
      STICKER_STATE.takeoverQueue.push(send);
      return;
    }
    STICKER_STATE.activeTakeover = true;
    const overlay = document.createElement('div');
    overlay.className = 'sticker-takeover-overlay';
    overlay.innerHTML = `
      <div class="sticker-takeover-bg"></div>
      <div class="sticker-takeover-center">
        <div class="sticker-takeover-sticker">${visualHtml(send)}</div>
        <div class="sticker-takeover-name">${escapeHtml(send.name || '')}</div>
      </div>
      <div class="sticker-takeover-sender">
        ${buildSenderChip(send)}
      </div>
    `;
    stage.appendChild(overlay);
    const holdMs = reduced ? 2200 : 5500;
    setTimeout(() => overlay.classList.add('is-leaving'), holdMs - 500);
    setTimeout(() => {
      overlay.remove();
      STICKER_STATE.activeTakeover = false;
      const next = STICKER_STATE.takeoverQueue.shift();
      if (next) playStickerAnimation(next);
    }, holdMs);
    return;
  }

  // Unknown animation → default float
  spawnStickerEl(stage, send, { x: 40, y: bounds.height - 90, size: 'md', duration: 2200 });
  spawnSenderChip(stage, send, 'bottom', 2400);
}

function processStickerSends() {
  const sends = Array.isArray(LIVE_STATE.stickers) ? LIVE_STATE.stickers : [];
  // Sort oldest first so queued takeovers replay in order
  const ordered = sends.slice().sort((a, b) => {
    const ta = new Date(a.createdAt || 0).getTime();
    const tb = new Date(b.createdAt || 0).getTime();
    return ta - tb;
  });
  for (const send of ordered) {
    if (!send.id || STICKER_STATE.displayedSendIds.has(send.id)) continue;
    STICKER_STATE.displayedSendIds.add(send.id);
    playStickerAnimation(send);
  }
  // Cap the set size so it doesn't grow forever across a long show
  if (STICKER_STATE.displayedSendIds.size > 400) {
    const arr = Array.from(STICKER_STATE.displayedSendIds);
    STICKER_STATE.displayedSendIds = new Set(arr.slice(arr.length - 200));
  }
}

/* ---- Top supporters leaderboard ---- */

function renderTopSupporters() {
  const list = document.getElementById('topSupportersList');
  if (!list) return;
  const top = Array.isArray(LIVE_STATE.topSupporters) ? LIVE_STATE.topSupporters : [];
  STICKER_STATE.topSupporters = top;
  if (!top.length) {
    list.innerHTML = '<li class="muted-sm">Be the first to send one.</li>';
    return;
  }
  list.innerHTML = top.map((s, i) => {
    const rank = i + 1;
    const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
    return `<li class="supporter-item ${rankClass}">
      <span class="supporter-rank">${rank}</span>
      <span class="supporter-name">${escapeHtml(s.userName || 'Fan')}</span>
      <span class="supporter-tier ${tierClass(s.userTier)}">${escapeHtml(s.userTier || 'Rookie')}</span>
      <span class="supporter-total">${Number(s.totalSpent || 0).toLocaleString()}</span>
    </li>`;
  }).join('');
}

/* ---- Mute toggle ---- */

(function wireStickerMute() {
  const btn = document.getElementById('stickerMuteBtn');
  if (!btn) return;
  const syncLabel = () => {
    btn.innerHTML = STICKER_STATE.muted ? '&#128263;' : '&#128276;';
    btn.title = STICKER_STATE.muted ? 'Unmute sticker animations' : 'Mute sticker animations';
    btn.setAttribute('aria-pressed', STICKER_STATE.muted ? 'true' : 'false');
  };
  syncLabel();
  btn.addEventListener('click', () => {
    STICKER_STATE.muted = !STICKER_STATE.muted;
    try { localStorage.setItem('aeob-stickers-muted', STICKER_STATE.muted ? '1' : '0'); } catch {}
    syncLabel();
    if (STICKER_STATE.muted) {
      // Also clear any in-progress stage
      const stage = document.getElementById('stickerStage');
      if (stage) stage.innerHTML = '';
      STICKER_STATE.activeTakeover = false;
      STICKER_STATE.takeoverQueue = [];
    }
    liveToast(STICKER_STATE.muted ? 'Stickers muted' : 'Stickers on');
  });
})();

/* ---- Sign-in button inside stickers panel ---- */

(function wireStickerSignIn() {
  const btn = document.getElementById('stickerSignInBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.click();
  });
})();

/* ---- Admin: sticker catalog management ---- */

async function fetchAdminStickers() {
  if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) return;
  try {
    const data = await postJson('admin-stickers', { action: 'list' });
    STICKER_STATE.adminCatalog = Array.isArray(data.stickers) ? data.stickers : [];
    renderAdminStickerList();
    renderAdminBroadcastOptions();
  } catch (err) {
    console.warn('admin-stickers list failed:', err.message);
  }
}

function renderAdminStickerList() {
  const container = document.getElementById('adminStickerList');
  if (!container) return;
  const list = STICKER_STATE.adminCatalog;
  if (!list.length) {
    container.innerHTML = '<p class="muted-sm">No stickers yet. Add one above.</p>';
    return;
  }
  container.innerHTML = list.map(s => `
    <div class="admin-sticker-row ${s.isActive ? '' : 'is-inactive'}" data-id="${escapeHtml(s.id)}">
      <span class="admin-sticker-emoji">${escapeHtml(s.emoji || '\uD83C\uDFC0')}</span>
      <span class="admin-sticker-name">${escapeHtml(s.name)}</span>
      <span class="admin-sticker-cost">${Number(s.cost).toLocaleString()}</span>
      <span class="admin-sticker-meta muted-sm">${escapeHtml(s.animation)} \u00b7 ${escapeHtml(s.tier)}</span>
      <div class="admin-sticker-actions">
        <button type="button" class="btn-chip" data-action="edit">Edit</button>
        <button type="button" class="btn-chip btn-chip-danger" data-action="delete">${s.isActive ? 'Hide' : 'Hidden'}</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.admin-sticker-row').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('[data-action="edit"]').addEventListener('click', () => {
      const s = STICKER_STATE.adminCatalog.find(x => x.id === id);
      if (s) loadStickerIntoForm(s);
    });
    row.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      const s = STICKER_STATE.adminCatalog.find(x => x.id === id);
      if (!s || !s.isActive) return;
      if (!confirm(`Hide "${s.name}"? Fans will no longer see it. History is kept.`)) return;
      try {
        await postJson('admin-stickers', { action: 'delete', id });
        liveToast('Sticker hidden');
        fetchAdminStickers();
        fetchStickerCatalog();
      } catch (err) {
        liveToast(err.message || 'Failed');
      }
    });
  });
}

function renderAdminBroadcastOptions() {
  const select = document.getElementById('adminBroadcastSticker');
  if (!select) return;
  const list = (STICKER_STATE.adminCatalog.length ? STICKER_STATE.adminCatalog : STICKER_STATE.catalog)
    .filter(s => s.isActive !== false);
  select.innerHTML = '<option value="">-- choose a sticker --</option>' +
    list.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.emoji || '')} ${escapeHtml(s.name)} (${escapeHtml(s.animation)})</option>`).join('');
}

function loadStickerIntoForm(s) {
  document.getElementById('adminStickerId').value = s.id || '';
  document.getElementById('adminStickerName').value = s.name || '';
  document.getElementById('adminStickerEmoji').value = s.emoji || '';
  document.getElementById('adminStickerCost').value = s.cost || 0;
  document.getElementById('adminStickerSort').value = s.sortOrder || 100;
  document.getElementById('adminStickerAnim').value = s.animation || 'float';
  document.getElementById('adminStickerTier').value = s.tier || 'Rookie';
  document.getElementById('adminStickerImg').value = s.imageUrl || '';
  document.getElementById('adminStickerDesc').value = s.description || '';
  document.getElementById('adminStickerActive').checked = s.isActive !== false;
  document.getElementById('adminStickerSubmit').textContent = 'Save changes';
  document.getElementById('adminStickerReset').style.display = 'inline-flex';
}

function resetAdminStickerForm() {
  const form = document.getElementById('adminStickerForm');
  if (!form) return;
  form.reset();
  document.getElementById('adminStickerId').value = '';
  document.getElementById('adminStickerActive').checked = true;
  document.getElementById('adminStickerSort').value = 100;
  document.getElementById('adminStickerSubmit').textContent = 'Add sticker';
  document.getElementById('adminStickerReset').style.display = 'none';
}

(function wireAdminStickerForm() {
  const form = document.getElementById('adminStickerForm');
  if (!form) return;
  const resetBtn = document.getElementById('adminStickerReset');
  if (resetBtn) resetBtn.addEventListener('click', (e) => { e.preventDefault(); resetAdminStickerForm(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) { liveToast('Admin only'); return; }
    const payload = {
      name: document.getElementById('adminStickerName').value.trim(),
      emoji: document.getElementById('adminStickerEmoji').value.trim(),
      cost: Number(document.getElementById('adminStickerCost').value),
      sortOrder: Number(document.getElementById('adminStickerSort').value),
      animationType: document.getElementById('adminStickerAnim').value,
      requiredTier: document.getElementById('adminStickerTier').value,
      imageUrl: document.getElementById('adminStickerImg').value.trim(),
      description: document.getElementById('adminStickerDesc').value.trim(),
      isActive: document.getElementById('adminStickerActive').checked
    };
    const id = document.getElementById('adminStickerId').value.trim();
    if (!payload.name) { liveToast('Name required'); return; }
    try {
      if (id) {
        await postJson('admin-stickers', Object.assign({ action: 'update', id }, payload));
        liveToast('Sticker updated');
      } else {
        await postJson('admin-stickers', Object.assign({ action: 'create' }, payload));
        liveToast('Sticker added');
      }
      resetAdminStickerForm();
      fetchAdminStickers();
      fetchStickerCatalog();
    } catch (err) {
      liveToast(err.message || 'Failed to save');
    }
  });
})();

(function wireAdminBroadcastForm() {
  const form = document.getElementById('adminBroadcastForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) { liveToast('Admin only'); return; }
    const stickerId = document.getElementById('adminBroadcastSticker').value;
    const message = document.getElementById('adminBroadcastMsg').value.trim();
    if (!stickerId) { liveToast('Pick a sticker'); return; }
    try {
      await postJson('admin-stickers', { action: 'broadcast', stickerId, message });
      liveToast('Broadcast sent');
      fetchLiveState();
    } catch (err) {
      liveToast(err.message || 'Broadcast failed');
    }
  });
})();

/* ---- Hook sticker rendering into the existing server-state pipeline ---- */

const _originalApplyServerState = applyServerState;
applyServerState = function patchedApplyServerState() {
  _originalApplyServerState.apply(this, arguments);
  processStickerSends();
  renderTopSupporters();
  // Re-render grid when balance might have shifted (e.g., admin earned points elsewhere)
  renderStickerGrid();
};

/* ---- Admin tools reveal when auth state flips to admin ---- */

function maybeLoadAdminSticker() {
  if (window.Auth && Auth.isAdmin && Auth.isAdmin()) {
    fetchAdminStickers();
  }
}
window.addEventListener('authStateChanged', maybeLoadAdminSticker);

/* ---- Initialize sticker subsystem ---- */

updateStickerPanelAuthState();
fetchStickerCatalog();
fetchUserBalance();
maybeLoadAdminSticker();
