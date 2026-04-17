/* ============================================
   AEOB — Trivia Game
   Placeholder question bank, localStorage stats,
   weekly leaderboard simulation.
   ============================================ */

const TRIVIA_BANK = {
  '1970s': [
    { q: 'Which year was the PBA officially founded?', a: ['1975','1973','1977','1971'], c: 0 },
    { q: 'Who was the first PBA MVP in 1975?', a: ['Robert Jaworski','Ramon Fernandez','Bogs Adornado','Atoy Co'], c: 2 },
    { q: 'Crispa\'s 1976 grand slam was led by which head coach?', a: ['Tommy Manotoc','Virgilio "Baby" Dalupan','Fort Acuña','Ed Ocampo'], c: 1 },
    { q: 'What team was Crispa\'s fiercest rival in the 70s?', a: ['U/Tex Wranglers','Toyota Tamaraws','Great Taste','Presto'], c: 1 },
    { q: 'Who was nicknamed "The Fortune Cookie"?', a: ['Philip Cezar','Atoy Co','Freddie Hubalde','Bernie Fabiosa'], c: 1 }
  ],
  '1980s': [
    { q: 'How many grand slams did Great Taste win in the 1980s?', a: ['1','2','0','3'], c: 0 },
    { q: 'Who won the 1985 PBA MVP award?', a: ['Ramon Fernandez','Abet Guidaben','Arnie Tuadles','Philip Cezar'], c: 0 },
    { q: 'Which team won three consecutive All-Filipino titles from 1988-1990?', a: ['Alaska','Purefoods','Shell','San Miguel'], c: 3 },
    { q: 'Who was the "Living Legend" of PBA?', a: ['Robert Jaworski','Atoy Co','Ramon Fernandez','Allan Caidic'], c: 0 },
    { q: 'Allan Caidic\'s famous 79-point game was in what year?', a: ['1988','1991','1985','1990'], c: 0 }
  ],
  '1990s': [
    { q: 'Which team won the 1996 PBA Grand Slam?', a: ['San Miguel','Purefoods','Alaska','Ginebra'], c: 2 },
    { q: 'Who coached Alaska during their grand slam?', a: ['Tim Cone','Yeng Guiao','Chot Reyes','Norman Black'], c: 0 },
    { q: 'Alvin Patrimonio won how many MVP awards in the 90s?', a: ['3','2','4','5'], c: 2 },
    { q: 'Who was the 1991 PBA MVP?', a: ['Benjie Paras','Samboy Lim','Allan Caidic','Ramon Fernandez'], c: 0 },
    { q: 'Which team was known as the "Phone Pals"?', a: ['Shell','Talk N Text','Mobiline','Purefoods'], c: 1 }
  ],
  '2000s': [
    { q: 'Who won the 2005 PBA MVP?', a: ['Willie Miller','Kerby Raymundo','Asi Taulava','Mark Caguioa'], c: 0 },
    { q: 'Talk N Text won back-to-back championships in what years?', a: ['2002-2003','2003-2004','2001-2002','2004-2005'], c: 0 },
    { q: 'Who coached San Miguel to multiple 2000s titles?', a: ['Jong Uichico','Yeng Guiao','Tim Cone','Norman Black'], c: 0 },
    { q: 'Which import dominated for Red Bull in the early 2000s?', a: ['Antonio Lang','Sean Lampley','Kelly Williams','Cyrus Baguio'], c: 0 },
    { q: 'What nickname did Mark Caguioa carry?', a: ['The Spark','The Kraken','The General','The Triggerman'], c: 0 }
  ],
  '2010s': [
    { q: 'How many MVPs has June Mar Fajardo won?', a: ['5','6','4','7'], c: 1 },
    { q: 'What year did SMB complete their Grand Slam?', a: ['2016','2017','2018','2015'], c: 1 },
    { q: 'Who was the 2012 PBA MVP (rookie)?', a: ['Jeff Chan','Gary David','James Yap','June Mar Fajardo'], c: 3 },
    { q: 'Which import starred for Ginebra in late 2010s?', a: ['Justin Brownlee','LA Tenorio','Allen Durham','Paul Harris'], c: 0 },
    { q: 'Who coached TNT during their 2011 grand slam?', a: ['Norman Black','Chot Reyes','Jong Uichico','Yeng Guiao'], c: 1 }
  ],
  'imports': [
    { q: 'Who is considered the greatest PBA import of all time by many?', a: ['Norman Black','Bobby Parks','Sean Chambers','Justin Brownlee'], c: 1 },
    { q: 'How many PBA Best Import awards did Bobby Parks win?', a: ['5','7','3','6'], c: 1 },
    { q: 'Sean Chambers played for which team extensively?', a: ['Alaska','San Miguel','Purefoods','Shell'], c: 0 },
    { q: 'Justin Brownlee plays for which team?', a: ['TNT','Ginebra','SMB','Magnolia'], c: 1 },
    { q: 'Norman Black later became a championship coach for?', a: ['Alaska','San Miguel','Purefoods','Meralco'], c: 1 }
  ]
};

const FAKE_WEEKLY_LEADERS = [
  { name: 'CrispaForLife', score: 1420 },
  { name: 'MangLaro88', score: 1385 },
  { name: 'TondoHoops', score: 1290 },
  { name: 'TamarawTime', score: 1210 },
  { name: 'CebuCourt', score: 1150 },
  { name: 'BanetJr', score: 1080 },
  { name: 'KrakenFan15', score: 1020 }
];

// ---------- State ----------
let currentDeck = [];
let qIdx = 0;
let score = 0;
let correctCount = 0;
let streak = 0;
let bestStreak = 0;
let timer = 20;
let timerInterval = null;
let answered = false;
const TIMER_MAX = 20;
const TIMER_CIRC = 2 * Math.PI * 45;

// ---------- Helpers ----------
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function buildDeck(category) {
  let pool;
  if (category === 'mixed') {
    pool = Object.values(TRIVIA_BANK).flat();
  } else {
    pool = TRIVIA_BANK[category] || TRIVIA_BANK['1970s'];
  }
  return shuffle(pool).slice(0, 10);
}

function getStats() {
  return JSON.parse(localStorage.getItem('aeob-trivia-stats') || '{"best":0,"played":0,"points":0,"recent":[]}');
}
function saveStats(s) { localStorage.setItem('aeob-trivia-stats', JSON.stringify(s)); }

function updateStatsDisplay() {
  const s = getStats();
  document.getElementById('trivBest').textContent = s.best;
  document.getElementById('trivPlayed').textContent = s.played;
  document.getElementById('trivPoints').textContent = s.points;
  // Rank based on best score
  const combined = [...FAKE_WEEKLY_LEADERS, { name: 'You', score: s.best, isYou: true }]
    .sort((a, b) => b.score - a.score);
  const rank = combined.findIndex(x => x.isYou) + 1;
  document.getElementById('trivRank').textContent = s.best > 0 ? '#' + rank : '—';
}

// ---------- Screens ----------
function showScreen(id) {
  document.querySelectorAll('.trivia-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ---------- Game Flow ----------
function startGame() {
  const cat = document.getElementById('trivCategory').value;
  currentDeck = buildDeck(cat);
  qIdx = 0; score = 0; correctCount = 0; streak = 0; bestStreak = 0;
  document.getElementById('trivScoreLive').textContent = '0';
  showScreen('screenPlaying');
  renderQuestion();
}

function renderQuestion() {
  const q = currentDeck[qIdx];
  if (!q) { endGame(); return; }
  answered = false;
  timer = TIMER_MAX;

  document.getElementById('trivQnum').textContent = qIdx + 1;
  document.getElementById('trivProgressFill').style.width = ((qIdx) / 10 * 100) + '%';
  document.getElementById('trivQuestion').textContent = q.q;
  document.getElementById('trivTimer').textContent = timer;

  const circle = document.getElementById('trivTimerCircle');
  circle.style.strokeDasharray = TIMER_CIRC;
  circle.style.strokeDashoffset = 0;
  circle.style.stroke = 'var(--orange-accent)';

  const shuffledOpts = q.a.map((opt, i) => ({ opt, i }));
  // Keep in original order so correct index stays usable, but labels A-D
  const container = document.getElementById('trivOptions');
  container.innerHTML = shuffledOpts.map((o, i) => `
    <button class="trivia-option" data-idx="${o.i}">
      <span class="t-option-letter">${String.fromCharCode(65 + i)}</span>
      <span class="t-option-label">${o.opt}</span>
    </button>
  `).join('');

  container.querySelectorAll('.trivia-option').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer(parseInt(btn.dataset.idx, 10), btn));
  });

  // Update streak display
  const streakEl = document.getElementById('trivStreak');
  if (streak >= 2) {
    streakEl.style.display = 'inline-flex';
    document.getElementById('trivStreakCount').textContent = streak;
  } else {
    streakEl.style.display = 'none';
  }

  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  const circle = document.getElementById('trivTimerCircle');
  timerInterval = setInterval(() => {
    timer -= 0.1;
    const pct = Math.max(0, timer / TIMER_MAX);
    circle.style.strokeDashoffset = TIMER_CIRC * (1 - pct);
    if (timer <= 5) circle.style.stroke = 'var(--red-primary)';
    document.getElementById('trivTimer').textContent = Math.max(0, Math.ceil(timer));
    if (timer <= 0) {
      clearInterval(timerInterval);
      if (!answered) selectAnswer(-1, null);
    }
  }, 100);
}

function selectAnswer(idx, btn) {
  if (answered) return;
  answered = true;
  clearInterval(timerInterval);
  const q = currentDeck[qIdx];
  const container = document.getElementById('trivOptions');
  const buttons = container.querySelectorAll('.trivia-option');

  const isCorrect = idx === q.c;
  const timeBonus = Math.max(0, Math.ceil(timer)) * 5;

  if (isCorrect) {
    score += 100 + timeBonus;
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    correctCount++;
    // Streak multipliers
    if (streak === 3 || streak === 5 || streak === 7) {
      score += 150;
    }
  } else {
    streak = 0;
  }

  // Highlight correct/wrong
  buttons.forEach(b => {
    const bidx = parseInt(b.dataset.idx, 10);
    if (bidx === q.c) b.classList.add('correct');
    else if (bidx === idx) b.classList.add('wrong');
    b.disabled = true;
  });

  document.getElementById('trivScoreLive').textContent = score;

  setTimeout(() => {
    qIdx++;
    if (qIdx >= 10) endGame();
    else renderQuestion();
  }, 1400);
}

function endGame() {
  clearInterval(timerInterval);
  const stats = getStats();
  stats.played++;
  stats.points += score;
  if (score > stats.best) stats.best = score;
  stats.recent.unshift({
    score, correct: correctCount, bestStreak, date: Date.now()
  });
  stats.recent = stats.recent.slice(0, 5);
  saveStats(stats);

  document.getElementById('trivFinalScore').textContent = score;
  document.getElementById('trivFinalCorrect').textContent = correctCount + ' / 10';
  document.getElementById('trivFinalStreak').textContent = bestStreak;
  document.getElementById('trivFinalAcc').textContent = Math.round(correctCount * 10) + '%';

  let title = 'Nice Try!';
  let icon = '&#127936;';
  if (correctCount >= 9) { title = 'PBA Legend!'; icon = '&#127942;'; }
  else if (correctCount >= 7) { title = 'Hardcore Fan!'; icon = '&#128293;'; }
  else if (correctCount >= 5) { title = 'Solid Knowledge'; icon = '&#128170;'; }
  document.getElementById('trivResultTitle').textContent = title;
  document.getElementById('trivResultIcon').innerHTML = icon;

  showScreen('screenResult');
  updateStatsDisplay();
  renderLeaderboard();
  renderPastGames();
}

// ---------- Leaderboard ----------
function renderLeaderboard() {
  const list = document.getElementById('trivLbList');
  if (!list) return;
  const stats = getStats();
  const combined = [...FAKE_WEEKLY_LEADERS];
  if (stats.best > 0) combined.push({ name: 'You', score: stats.best, isYou: true });
  combined.sort((a, b) => b.score - a.score);
  list.innerHTML = combined.slice(0, 8).map((f, i) => `
    <div class="trivia-lb-row ${f.isYou ? 'is-you' : ''}">
      <div class="rank-num ${['gold','silver','bronze'][i] || ''}">${i + 1}</div>
      <div class="trivia-lb-name">${f.name}${f.isYou ? ' <span class="you-tag">You</span>' : ''}</div>
      <div class="trivia-lb-score">${f.score}</div>
    </div>
  `).join('');
}

function renderPastGames() {
  const list = document.getElementById('pastGamesList');
  if (!list) return;
  const stats = getStats();
  if (!stats.recent.length) {
    list.innerHTML = '<p class="muted-sm">Finished games will appear here.</p>';
    return;
  }
  list.innerHTML = stats.recent.map(g => {
    const date = new Date(g.date);
    return `<div class="past-game-row">
      <div class="pg-score">${g.score}</div>
      <div class="pg-info">
        <div>${g.correct}/10 correct &middot; ${g.bestStreak} streak</div>
        <div class="muted-sm">${date.toLocaleDateString()} ${date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</div>
      </div>
    </div>`;
  }).join('');
}

// ---------- Weekly Reset Countdown ----------
function updateLbCountdown() {
  const el = document.getElementById('trivLbCountdown');
  if (!el) return;
  const now = new Date();
  const nextMon = new Date(now);
  const daysToMon = (8 - now.getDay()) % 7 || 7;
  nextMon.setDate(now.getDate() + daysToMon);
  nextMon.setHours(0, 0, 0, 0);
  const diff = nextMon - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  el.textContent = `Resets in ${d}d ${h}h`;
}

// ---------- Bindings ----------
document.getElementById('startTrivia')?.addEventListener('click', startGame);
document.getElementById('playAgainBtn')?.addEventListener('click', () => showScreen('screenIntro'));
document.getElementById('shareResultBtn')?.addEventListener('click', () => {
  const text = `I just scored ${score} on the AEOB PBA Trivia Challenge! ${correctCount}/10 correct. Can you beat it?`;
  if (navigator.share) {
    navigator.share({ title: 'AEOB Trivia', text, url: location.href });
  } else {
    navigator.clipboard?.writeText(text + ' ' + location.href);
    const t = document.getElementById('toast');
    if (t) { t.textContent = 'Result copied to clipboard!'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }
  }
});

// ---------- Init ----------
updateStatsDisplay();
renderLeaderboard();
renderPastGames();
updateLbCountdown();
setInterval(updateLbCountdown, 60000);
