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

// ---------- Tier helpers ----------
const TIER_ORDER = ['Rookie', 'Veteran', 'All-Star', 'Legend'];
function tierRank(name) {
  const idx = TIER_ORDER.indexOf(name);
  return idx < 0 ? 0 : idx;
}
function currentUserTier() {
  const u = (window.Auth && Auth.getUser && Auth.getUser()) || null;
  if (!u) return null; // not signed in
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

// ---------- Live Reactions (tier-gated) ----------
function applyReactionTierGates() {
  const userTier = currentUserTier();
  const userRank = userTier ? tierRank(userTier) : -1; // -1 = not signed in (Rookie reactions still allowed)
  const hint = document.getElementById('reactionsTierHint');
  if (hint) {
    hint.textContent = userTier ? `— you're ${userTier}` : '— sign in to unlock more';
  }
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    const needed = btn.dataset.tier || 'Rookie';
    const neededRank = tierRank(needed);
    // Guests can react with Rookie-tier emojis
    const allowed = userRank >= 0 ? userRank >= neededRank : neededRank === 0;
    btn.classList.toggle('locked', !allowed);
    btn.setAttribute('aria-disabled', allowed ? 'false' : 'true');
    if (!allowed) {
      btn.title = userTier
        ? `Unlocks at ${needed} (you're ${userTier})`
        : `Unlocks at ${needed} — sign in to earn points`;
    } else {
      btn.title = `${needed}+`;
    }
  });
}

document.querySelectorAll('.reaction-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('locked')) {
      const needed = btn.dataset.tier || 'Rookie';
      liveToast(`Reach ${needed} to unlock this reaction`);
      return;
    }
    const countEl = btn.querySelector('.r-count');
    if (!countEl) return;
    let count = parseInt(countEl.dataset.count || '0', 10);
    count++;
    countEl.dataset.count = count;
    countEl.textContent = count;
    btn.classList.add('reacting');
    // Floating emoji effect (first text node is the emoji)
    const emoji = btn.childNodes[0].textContent.trim();
    spawnFloatingReaction(emoji, btn);
    setTimeout(() => btn.classList.remove('reacting'), 400);
  });
});

applyReactionTierGates();
window.addEventListener('authStateChanged', applyReactionTierGates);

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

// ---------- Live Polls (base data + admin-created) ----------
const ADMIN_POLLS_KEY = 'aeob-live-polls-admin';
function loadAdminPolls() {
  try { return JSON.parse(localStorage.getItem(ADMIN_POLLS_KEY)) || []; }
  catch { return []; }
}
function saveAdminPolls(list) {
  localStorage.setItem(ADMIN_POLLS_KEY, JSON.stringify(list));
}
function allPolls() {
  return loadAdminPolls().concat(LIVE_POLLS);
}

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

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function renderLivePolls() {
  const list = document.getElementById('livePollsList');
  if (!list) return;
  const isAdmin = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());
  const polls = allPolls();

  if (!polls.length) {
    list.innerHTML = `<p class="muted-sm" style="text-align:center;padding:16px;">No polls yet. ${isAdmin ? 'Create one above.' : 'Check back during the show.'}</p>`;
    return;
  }

  list.innerHTML = polls.map(poll => {
    const isCustom = poll.id && poll.id.startsWith('custom-');
    const adminControls = isAdmin ? `
      <div class="poll-admin-controls">
        ${poll.locked
          ? `<button class="btn-chip" data-admin-action="unlock" data-poll="${poll.id}">Unlock</button>`
          : `<button class="btn-chip" data-admin-action="lock" data-poll="${poll.id}">Lock</button>`}
        ${isCustom ? `<button class="btn-chip btn-chip-danger" data-admin-action="delete" data-poll="${poll.id}">Delete</button>` : ''}
      </div>` : '';

    if (poll.locked) {
      return `<div class="live-poll locked">
        <div class="poll-lock-icon">&#128274;</div>
        <p class="poll-question">${escapeHtml(poll.question)}</p>
        <p class="muted-sm">Unlocks when the topic comes up on the show</p>
        ${adminControls}
      </div>`;
    }
    const userVote = localStorage.getItem('aeob-poll-' + poll.id);
    const numOpts = poll.options.length;
    const totalsRaw = JSON.parse(localStorage.getItem('aeob-poll-totals-' + poll.id) || 'null');
    const totals = Array.isArray(totalsRaw) && totalsRaw.length === numOpts ? totalsRaw : new Array(numOpts).fill(0);
    const totalVotes = totals.reduce((a, b) => a + b, 0);

    return `<div class="live-poll ${isCustom ? 'is-custom' : ''}">
      <p class="poll-question">${escapeHtml(poll.question)}</p>
      <div class="poll-options">
        ${poll.options.map((opt, i) => {
          const pct = totalVotes ? Math.round((totals[i] / totalVotes) * 100) : 0;
          const selected = userVote === String(i);
          const hostPickers = poll.hostPicks ? Object.entries(poll.hostPicks).filter(([h, v]) => v === i).map(([h]) => h) : [];
          return `<button class="poll-option ${selected ? 'voted' : ''}" data-poll="${poll.id}" data-opt="${i}" ${userVote !== null ? 'disabled' : ''}>
            <div class="poll-option-bar" style="width:${userVote !== null ? pct : 0}%"></div>
            <div class="poll-option-content">
              <span class="poll-option-label">${escapeHtml(opt)}</span>
              ${hostPickers.length ? `<span class="poll-host-tags">${hostPickers.map(h => `<span class="host-tag">${escapeHtml(h)}</span>`).join('')}</span>` : ''}
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
    btn.addEventListener('click', () => {
      const pollId = btn.dataset.poll;
      const optIdx = parseInt(btn.dataset.opt, 10);
      if (localStorage.getItem('aeob-poll-' + pollId) !== null) return;
      localStorage.setItem('aeob-poll-' + pollId, String(optIdx));
      const poll = allPolls().find(p => p.id === pollId);
      const size = poll ? poll.options.length : 4;
      const totalsRaw = JSON.parse(localStorage.getItem('aeob-poll-totals-' + pollId) || 'null');
      const totals = Array.isArray(totalsRaw) && totalsRaw.length === size ? totalsRaw : new Array(size).fill(0);
      totals[optIdx]++;
      localStorage.setItem('aeob-poll-totals-' + pollId, JSON.stringify(totals));
      liveToast('Vote locked in!');
      renderLivePolls();
    });
  });

  list.querySelectorAll('[data-admin-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = btn.dataset.adminAction;
      const pollId = btn.dataset.poll;
      const admins = loadAdminPolls();
      const idx = admins.findIndex(p => p.id === pollId);

      if (action === 'delete' && idx !== -1) {
        if (!confirm('Delete this poll? Votes will be cleared.')) return;
        admins.splice(idx, 1);
        saveAdminPolls(admins);
        localStorage.removeItem('aeob-poll-' + pollId);
        localStorage.removeItem('aeob-poll-totals-' + pollId);
        liveToast('Poll deleted');
      } else if (action === 'lock' || action === 'unlock') {
        if (idx !== -1) {
          admins[idx].locked = (action === 'lock');
          saveAdminPolls(admins);
        } else {
          const base = LIVE_POLLS.find(p => p.id === pollId);
          if (base) base.locked = (action === 'lock');
        }
        liveToast(action === 'lock' ? 'Poll locked' : 'Poll unlocked');
      }
      renderLivePolls();
    });
  });
}
renderLivePolls();

// ---------- Admin: Create Poll ----------
const adminPollForm = document.getElementById('adminCreatePoll');
if (adminPollForm) {
  adminPollForm.addEventListener('submit', (e) => {
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

    const poll = {
      id: 'custom-' + Date.now().toString(36),
      question,
      options,
      hostPicks: null,
      locked: !!(lockedEl && lockedEl.checked)
    };
    const admins = loadAdminPolls();
    admins.unshift(poll);
    saveAdminPolls(admins);

    adminPollForm.reset();
    if (msgEl) { msgEl.textContent = 'Poll published.'; msgEl.classList.remove('is-error'); setTimeout(() => { msgEl.textContent = ''; }, 2500); }
    liveToast('Poll published');
    renderLivePolls();
  });
}

// Re-render polls (and toggle admin controls) when auth changes
window.addEventListener('authStateChanged', renderLivePolls);

// ---------- Questions / Q&A ----------
const QUESTIONS_KEY = 'aeob-live-questions';
const QUESTION_COOLDOWN_MS = 15000; // 15s between posts

function loadQuestions() {
  try { return JSON.parse(localStorage.getItem(QUESTIONS_KEY)) || []; }
  catch { return []; }
}
function saveQuestions(list) {
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(list.slice(0, 100)));
}
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function renderQuestions() {
  const list = document.getElementById('questionsList');
  if (!list) return;
  const qs = loadQuestions();
  const isAdmin = !!(window.Auth && Auth.isAdmin && Auth.isAdmin());

  if (!qs.length) {
    list.innerHTML = `<p class="muted-sm" style="text-align:center;padding:16px;">No questions yet. Be the first.</p>`;
  } else {
    // Sort: higher tier first, then newest
    const sorted = qs.slice().sort((a, b) => {
      const tr = tierRank(b.tier) - tierRank(a.tier);
      return tr !== 0 ? tr : (b.ts - a.ts);
    });
    list.innerHTML = sorted.map(q => `
      <div class="question-item ${tierClass(q.tier)}" data-qid="${q.id}">
        <div class="question-head">
          <span class="question-author">${escapeHtml(q.name || 'Fan')}</span>
          <span class="question-tier ${tierClass(q.tier)}">${escapeHtml(q.tier || 'Rookie')}</span>
          <span class="question-time muted-sm">${timeAgo(q.ts)}</span>
        </div>
        <p class="question-text">${escapeHtml(q.text)}</p>
        <div class="question-foot">
          <button class="question-like" data-qid="${q.id}">&#128077; <span>${q.likes || 0}</span></button>
          ${isAdmin ? `<button class="question-delete" data-qid="${q.id}" title="Remove">&times;</button>` : ''}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.question-like').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.qid;
        const likedKey = 'aeob-q-liked-' + qid;
        if (localStorage.getItem(likedKey)) return;
        const all = loadQuestions();
        const item = all.find(x => x.id === qid);
        if (!item) return;
        item.likes = (item.likes || 0) + 1;
        saveQuestions(all);
        localStorage.setItem(likedKey, '1');
        renderQuestions();
      });
    });
    list.querySelectorAll('.question-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!(window.Auth && Auth.isAdmin && Auth.isAdmin())) return;
        const qid = btn.dataset.qid;
        const all = loadQuestions().filter(x => x.id !== qid);
        saveQuestions(all);
        liveToast('Question removed');
        renderQuestions();
      });
    });
  }
}

function updateQuestionsCompose() {
  const input = document.getElementById('questionInput');
  const btn = document.getElementById('questionSubmit');
  const label = document.getElementById('questionTierLabel');
  if (!input || !btn) return;
  const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
  if (!user) {
    input.disabled = true;
    btn.disabled = true;
    input.placeholder = 'Sign in to ask a question';
    if (label) label.textContent = 'Sign in to post';
    return;
  }
  input.disabled = false;
  btn.disabled = false;
  input.placeholder = 'Drop a question for the show...';
  const tier = user.tier || 'Rookie';
  if (label) label.innerHTML = `Posting as <strong>${escapeHtml(user.name || 'Fan')}</strong> <span class="question-tier ${tierClass(tier)}">${escapeHtml(tier)}</span>`;
}

const questionSubmit = document.getElementById('questionSubmit');
if (questionSubmit) {
  questionSubmit.addEventListener('click', () => {
    const input = document.getElementById('questionInput');
    if (!input) return;
    const user = (window.Auth && Auth.getUser && Auth.getUser()) || null;
    if (!user) { liveToast('Sign in to post'); return; }

    const text = (input.value || '').trim();
    if (!text) return;

    const last = parseInt(localStorage.getItem('aeob-q-last') || '0', 10);
    if (Date.now() - last < QUESTION_COOLDOWN_MS) {
      const wait = Math.ceil((QUESTION_COOLDOWN_MS - (Date.now() - last)) / 1000);
      liveToast(`Slow down — try again in ${wait}s`);
      return;
    }

    const all = loadQuestions();
    all.unshift({
      id: 'q-' + Date.now().toString(36),
      name: user.name || 'Fan',
      tier: user.tier || 'Rookie',
      text,
      ts: Date.now(),
      likes: 0
    });
    saveQuestions(all);
    localStorage.setItem('aeob-q-last', String(Date.now()));
    input.value = '';
    liveToast('Question posted');
    renderQuestions();
  });
}

renderQuestions();
updateQuestionsCompose();
window.addEventListener('authStateChanged', () => { updateQuestionsCompose(); renderQuestions(); });

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
