/* ============================================
   AEOB — Predictions "Beat the Crew" Logic
   Placeholder data with localStorage persistence.
   Replace QUESTIONS/HOSTS with backend data later.
   ============================================ */

const HOSTS = ['Charlie', 'Sid', 'Noel', 'Jay'];

const QUESTIONS = [
  {
    id: 'q-301',
    episode: 301,
    status: 'open',
    question: 'Who is the greatest Crispa Redmanizer of all time?',
    options: ['Atoy Co', 'Philip Cezar', 'Bogs Adornado', 'Freddie Hubalde'],
    hostPicks: { Charlie: 0, Sid: 1, Noel: 0, Jay: 2 },
    correct: null,
    category: 'Dynasty'
  },
  {
    id: 'q-302',
    episode: 301,
    status: 'open',
    question: 'Best PBA import of all time?',
    options: ['Bobby Parks', 'Norman Black', 'Sean Chambers', 'Justin Brownlee'],
    hostPicks: { Charlie: 0, Sid: 1, Noel: 0, Jay: 3 },
    correct: null,
    category: 'Imports'
  },
  {
    id: 'q-303',
    episode: 301,
    status: 'open',
    question: 'Which 1980s team deserves more credit than they get?',
    options: ['Great Taste', 'Shell', 'Presto', 'Alaska'],
    hostPicks: { Charlie: 0, Sid: 2, Noel: 0, Jay: 3 },
    correct: null,
    category: 'Teams'
  },
  {
    id: 'q-300',
    episode: 300,
    status: 'resolved',
    question: 'Who won the 1989 All-Filipino Conference MVP?',
    options: ['Alvin Patrimonio', 'Allan Caidic', 'Benjie Paras', 'Samboy Lim'],
    hostPicks: { Charlie: 2, Sid: 2, Noel: 0, Jay: 1 },
    correct: 2,
    category: 'Awards'
  },
  {
    id: 'q-299',
    episode: 300,
    status: 'resolved',
    question: 'Which team had the best 1990s dynasty?',
    options: ['Alaska Milkmen', 'San Miguel Beermen', 'Purefoods', 'Ginebra'],
    hostPicks: { Charlie: 0, Sid: 0, Noel: 1, Jay: 0 },
    correct: 0,
    category: 'Dynasty'
  },
  {
    id: 'q-298',
    episode: 299,
    status: 'resolved',
    question: 'Best two-way player of the 1970s?',
    options: ['Philip Cezar', 'Robert Jaworski', 'Ramon Fernandez', 'Abet Guidaben'],
    hostPicks: { Charlie: 1, Sid: 0, Noel: 2, Jay: 1 },
    correct: 2,
    category: 'Players'
  }
];

const HOST_SEASON_STATS = {
  Charlie: { correct: 18, total: 24 },
  Sid: { correct: 16, total: 24 },
  Noel: { correct: 14, total: 24 },
  Jay: { correct: 12, total: 24 }
};

const TOP_FANS = [
  { name: 'MangLaro88', points: 340, accuracy: 71 },
  { name: 'CrispaForLife', points: 312, accuracy: 68 },
  { name: 'TondoHoops', points: 295, accuracy: 65 },
  { name: 'TamarawTime', points: 280, accuracy: 62 },
  { name: 'CebuCourt', points: 265, accuracy: 60 }
];

// ---------- Storage ----------
const storeKey = (id) => 'aeob-pick-' + id;
function getUserPick(qId) { const v = localStorage.getItem(storeKey(qId)); return v === null ? null : parseInt(v, 10); }
function setUserPick(qId, idx) { localStorage.setItem(storeKey(qId), String(idx)); }

// ---------- User Stats ----------
function computeUserStats() {
  let correct = 0, total = 0, currentStreak = 0, bestStreak = 0, points = 0, beats = 0;
  const resolved = QUESTIONS.filter(q => q.status === 'resolved').sort((a, b) => a.episode - b.episode);
  resolved.forEach(q => {
    const pick = getUserPick(q.id);
    if (pick === null) { currentStreak = 0; return; }
    total++;
    if (pick === q.correct) {
      correct++; currentStreak++; bestStreak = Math.max(bestStreak, currentStreak);
      points += 10;
      if (currentStreak >= 2) points += 5;
      const beatAll = HOSTS.every(h => q.hostPicks[h] !== q.correct);
      if (beatAll) { beats++; points += 15; }
    } else {
      currentStreak = 0;
    }
  });
  return { correct, total, streak: currentStreak, bestStreak, points, beats };
}

function updateStatusBar() {
  const stats = computeUserStats();
  const accEl = document.getElementById('myAccuracy');
  const streakEl = document.getElementById('myStreak');
  const pointsEl = document.getElementById('myPoints');
  const rankEl = document.getElementById('myRank');
  if (accEl) accEl.textContent = stats.total ? Math.round((stats.correct / stats.total) * 100) + '%' : '—';
  if (streakEl) streakEl.textContent = stats.streak;
  if (pointsEl) pointsEl.textContent = stats.points;
  if (rankEl) {
    if (!stats.points) { rankEl.textContent = '—'; return; }
    const combined = [...TOP_FANS, { name: 'You', points: stats.points }];
    combined.sort((a, b) => b.points - a.points);
    rankEl.textContent = '#' + (combined.findIndex(f => f.name === 'You') + 1);
  }
}

// ---------- Open Questions ----------
function renderOpenQuestions() {
  const openQs = QUESTIONS.filter(q => q.status === 'open');
  const container = document.getElementById('openQuestions');
  const openCountEl = document.getElementById('openCount');
  if (openCountEl) openCountEl.textContent = openQs.length;
  if (!container) return;

  if (!openQs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9201;</div><h3>No open questions right now</h3><p>New picks drop before each episode.</p></div>`;
    return;
  }

  container.innerHTML = openQs.map(q => {
    const userPick = getUserPick(q.id);
    const locked = userPick !== null;
    return `
      <div class="question-card ${locked ? 'is-locked' : ''}">
        <div class="question-meta">
          <span class="question-cat">${q.category}</span>
          <span class="muted-sm">Ep ${q.episode}</span>
        </div>
        <h3 class="question-text">${q.question}</h3>
        <div class="question-options">
          ${q.options.map((opt, i) => {
            const hostsOnThis = HOSTS.filter(h => q.hostPicks[h] === i);
            const isMine = userPick === i;
            return `
              <button class="q-option ${isMine ? 'is-mine' : ''} ${locked && !isMine ? 'is-other' : ''}"
                      data-q="${q.id}" data-opt="${i}" ${locked ? 'disabled' : ''}>
                <div class="q-option-main">
                  <span class="q-option-letter">${String.fromCharCode(65 + i)}</span>
                  <span class="q-option-label">${opt}</span>
                </div>
                <div class="q-option-side">
                  ${hostsOnThis.length ? `<div class="q-host-pills">${hostsOnThis.map(h => `<span class="host-pill host-${h.toLowerCase()}" title="${h}">${h[0]}</span>`).join('')}</div>` : ''}
                  ${isMine ? '<span class="q-mine-tag">Your Pick</span>' : ''}
                </div>
              </button>
            `;
          }).join('')}
        </div>
        ${locked
          ? `<div class="question-footer locked"><span>&#128274; Locked in. Results after Ep ${q.episode}.</span></div>`
          : `<div class="question-footer"><span class="muted-sm">Choose one — your pick locks in immediately.</span></div>`}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.q-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = btn.dataset.q;
      const idx = parseInt(btn.dataset.opt, 10);
      if (getUserPick(qId) !== null) return;
      setUserPick(qId, idx);
      predictToast('Pick locked in! Good luck.');
      renderOpenQuestions();
    });
  });
}

// ---------- Resolved ----------
function renderResolved() {
  const resolved = QUESTIONS.filter(q => q.status === 'resolved').sort((a, b) => b.episode - a.episode);
  const container = document.getElementById('resolvedQuestions');
  if (!container) return;
  if (!resolved.length) {
    container.innerHTML = `<div class="empty-state"><h3>No resolved questions yet.</h3></div>`;
    return;
  }

  container.innerHTML = resolved.map(q => {
    const userPick = getUserPick(q.id);
    const userCorrect = userPick === q.correct;
    const userPicked = userPick !== null;
    return `
      <div class="resolved-card ${userPicked ? (userCorrect ? 'correct' : 'wrong') : 'skipped'}">
        <div class="question-meta">
          <span class="question-cat">${q.category}</span>
          <span class="muted-sm">Ep ${q.episode}</span>
          ${userPicked ? `<span class="resolved-status ${userCorrect ? 'correct' : 'wrong'}">${userCorrect ? '✓ Correct' : '✗ Missed'}</span>` : '<span class="resolved-status skipped">Skipped</span>'}
        </div>
        <h3 class="question-text">${q.question}</h3>
        <div class="resolved-options">
          ${q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isMine = userPick === i;
            const hostsOnThis = HOSTS.filter(h => q.hostPicks[h] === i);
            return `
              <div class="resolved-option ${isCorrect ? 'is-correct' : ''} ${isMine ? 'is-mine' : ''}">
                <div class="r-option-label">
                  ${isCorrect ? '<span class="r-check">✓</span>' : '<span class="r-check-space"></span>'}
                  <span>${opt}</span>
                </div>
                <div class="r-option-side">
                  ${hostsOnThis.length ? `<div class="q-host-pills">${hostsOnThis.map(h => `<span class="host-pill host-${h.toLowerCase()}">${h[0]}</span>`).join('')}</div>` : ''}
                  ${isMine ? '<span class="q-mine-tag">You</span>' : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Leaderboard ----------
function renderHostRanks() {
  const container = document.getElementById('hostRanks');
  if (!container) return;
  const ranked = HOSTS.map(h => ({
    name: h,
    ...HOST_SEASON_STATS[h],
    acc: Math.round((HOST_SEASON_STATS[h].correct / HOST_SEASON_STATS[h].total) * 100)
  })).sort((a, b) => b.acc - a.acc);

  container.innerHTML = ranked.map((h, i) => `
    <div class="rank-row">
      <div class="rank-num ${['gold','silver','bronze'][i] || ''}">${i + 1}</div>
      <div class="rank-info">
        <div class="rank-name">${h.name}</div>
        <div class="rank-meta muted-sm">${h.correct} of ${h.total} correct</div>
      </div>
      <div class="rank-bar">
        <div class="rank-bar-fill" style="width:${h.acc}%"></div>
        <span class="rank-bar-val">${h.acc}%</span>
      </div>
    </div>
  `).join('');
}

function renderFanRanks() {
  const container = document.getElementById('fanRanks');
  if (!container) return;
  const stats = computeUserStats();
  const combined = [...TOP_FANS];
  if (stats.points) combined.push({
    name: 'You',
    points: stats.points,
    accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
    isYou: true
  });
  combined.sort((a, b) => b.points - a.points);

  container.innerHTML = combined.slice(0, 6).map((f, i) => `
    <div class="rank-row ${f.isYou ? 'is-you' : ''}">
      <div class="rank-num ${['gold','silver','bronze'][i] || ''}">${i + 1}</div>
      <div class="rank-info">
        <div class="rank-name">${f.name}${f.isYou ? ' <span class="you-tag">You</span>' : ''}</div>
        <div class="rank-meta muted-sm">${f.accuracy}% accuracy</div>
      </div>
      <div class="rank-points">${f.points} pts</div>
    </div>
  `).join('');
}

function renderHeadToHead() {
  const grid = document.getElementById('h2hGrid');
  if (!grid) return;
  const stats = computeUserStats();
  if (!stats.total) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>Lock in some picks first</h3><p>Your head-to-head vs each host appears once you've picked on at least one resolved question.</p></div>`;
    return;
  }
  const resolved = QUESTIONS.filter(q => q.status === 'resolved');
  const hostWins = { Charlie: 0, Sid: 0, Noel: 0, Jay: 0 };
  const hostLosses = { Charlie: 0, Sid: 0, Noel: 0, Jay: 0 };
  resolved.forEach(q => {
    const pick = getUserPick(q.id);
    if (pick === null) return;
    const youRight = pick === q.correct;
    HOSTS.forEach(h => {
      const hostRight = q.hostPicks[h] === q.correct;
      if (youRight && !hostRight) hostWins[h]++;
      if (!youRight && hostRight) hostLosses[h]++;
    });
  });

  grid.innerHTML = HOSTS.map(h => {
    const diff = hostWins[h] - hostLosses[h];
    const lead = diff > 0 ? 'you' : diff < 0 ? 'host' : 'tied';
    return `
      <div class="h2h-card lead-${lead}">
        <div class="h2h-header">
          <div class="h2h-host">vs ${h}</div>
          <div class="h2h-lead ${lead}">${lead === 'you' ? 'You lead' : lead === 'host' ? `${h} leads` : 'Tied'}</div>
        </div>
        <div class="h2h-score">
          <div class="h2h-side you"><span class="label">You</span><span class="val">${hostWins[h]}</span></div>
          <div class="h2h-divider">—</div>
          <div class="h2h-side host"><span class="label">${h}</span><span class="val">${hostLosses[h]}</span></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Tabs ----------
document.querySelectorAll('.predict-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.predict-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(btn.dataset.tab + 'Panel');
    if (panel) panel.classList.add('active');
  });
});

// ---------- Toast ----------
function predictToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ---------- Init ----------
renderOpenQuestions();
renderResolved();
renderHostRanks();
renderFanRanks();
renderHeadToHead();
updateStatusBar();
