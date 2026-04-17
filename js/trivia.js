/* ============================================
   AEOB — PBA Trivia Millionaire
   Who-Wants-To-Be-A-Millionaire format.
   15 questions. Credits double each level.
   Safe levels: Q5 (16), Q10 (512), Q13 (4096).
   15-second timer. Anti-cheat: tab-blur kill,
   no-select/no-copy/no-context, short window.
   ============================================ */

/* ------------ Question Bank ------------ */
/* 15 tiers of difficulty — each tier provides 4+ questions so we can randomize.
   Tier 1 is easiest, tier 15 is nearly impossible deep-cut trivia. */

const TRIVIA_TIERS = [
  /* Tier 1 — gimmes */
  [
    { q: 'What league does the PBA stand for?', a: ['Pilipinas Basketball Association','Philippine Basketball Association','Pro Basketball Association','Pinoy Basketball Alliance'], c: 1 },
    { q: 'In what decade was the PBA founded?', a: ['1960s','1970s','1980s','1990s'], c: 1 },
    { q: 'How many players are on the court per team in a PBA game?', a: ['5','6','4','7'], c: 0 },
    { q: 'The PBA is the first professional basketball league in which region?', a: ['North America','Europe','Asia','South America'], c: 2 },
    { q: 'What color is a basketball traditionally?', a: ['Orange','Blue','Red','Green'], c: 0 }
  ],
  /* Tier 2 — easy */
  [
    { q: 'Which of these teams is known as the "Beermen"?', a: ['Ginebra','San Miguel','Alaska','Magnolia'], c: 1 },
    { q: 'Which team is known as the "Barangay" franchise?', a: ['Ginebra','TNT','Rain or Shine','Meralco'], c: 0 },
    { q: 'Which team color is most associated with Ginebra?', a: ['Blue and yellow','Red and white','Green and white','Black and gold'], c: 1 },
    { q: 'June Mar Fajardo is primarily associated with which franchise?', a: ['Alaska','San Miguel Beermen','TNT','Magnolia'], c: 1 },
    { q: 'What is the standard length of a PBA quarter in minutes?', a: ['10','12','8','15'], c: 1 }
  ],
  /* Tier 3 */
  [
    { q: 'Which year was the PBA officially founded?', a: ['1975','1973','1977','1971'], c: 0 },
    { q: 'Who is often called "The Living Legend" of the PBA?', a: ['Ramon Fernandez','Robert Jaworski','Atoy Co','Bogs Adornado'], c: 1 },
    { q: 'What trophy is given to the top player each conference?', a: ['PBA Cup','Finals MVP','Best Player of the Conference','Scoring King'], c: 2 },
    { q: 'How many conferences does a typical modern PBA season have?', a: ['2','3','4','1'], c: 1 },
    { q: 'Which Pinoy nickname means "The Spark"?', a: ['Jayjay Helterbrand','Mark Caguioa','James Yap','Asi Taulava'], c: 1 }
  ],
  /* Tier 4 */
  [
    { q: 'Who was the first-ever PBA MVP in 1975?', a: ['Robert Jaworski','Ramon Fernandez','Bogs Adornado','Atoy Co'], c: 2 },
    { q: 'Which team won the very first PBA championship?', a: ['Toyota','Crispa','U/Tex','Royal Tru-Orange'], c: 3 },
    { q: 'Which team completed the first PBA Grand Slam in 1976?', a: ['Toyota Tamaraws','Crispa Redmanizers','Great Taste','Shell'], c: 1 },
    { q: 'What is the "Grand Slam" in PBA?', a: ['Winning all conferences in one season','Scoring 50+ points','Winning 3 straight titles','Finals sweep'], c: 0 },
    { q: 'Who was Crispa\'s rival throughout the 1970s?', a: ['U/Tex','Toyota','Great Taste','Gilbey\'s Gin'], c: 1 }
  ],
  /* Tier 5 — first safe level (16 credits) */
  [
    { q: 'Allan Caidic\'s famous 79-point game occurred in what year?', a: ['1988','1991','1985','1990'], c: 0 },
    { q: 'How many MVP awards has June Mar Fajardo won?', a: ['5','6','7','8'], c: 1 },
    { q: 'Who coached Alaska during their 1996 Grand Slam?', a: ['Yeng Guiao','Tim Cone','Chot Reyes','Norman Black'], c: 1 },
    { q: 'Alvin Patrimonio won how many league MVP awards?', a: ['2','3','4','5'], c: 2 },
    { q: 'Which team won the 1989 All-Filipino Conference?', a: ['Purefoods','San Miguel','Shell','Alaska'], c: 0 }
  ],
  /* Tier 6 */
  [
    { q: 'Who coached Crispa during their back-to-back Grand Slams?', a: ['Tommy Manotoc','Virgilio "Baby" Dalupan','Fort Acuña','Ed Ocampo'], c: 1 },
    { q: 'Which year did San Miguel Beermen complete their modern Grand Slam?', a: ['2015','2016','2017','2018'], c: 1 },
    { q: 'Who was the 1991 PBA MVP?', a: ['Samboy Lim','Benjie Paras','Allan Caidic','Ramon Fernandez'], c: 1 },
    { q: 'Which team was rebranded as "Phone Pals"?', a: ['Shell','Mobiline','Talk N Text','Purefoods'], c: 2 },
    { q: 'Who was nicknamed "The Fortune Cookie"?', a: ['Philip Cezar','Atoy Co','Freddie Hubalde','Bernie Fabiosa'], c: 1 }
  ],
  /* Tier 7 */
  [
    { q: 'Talk N Text won back-to-back All-Filipino titles in which years?', a: ['2002 and 2003','2011 and 2012','2005 and 2006','2013 and 2014'], c: 1 },
    { q: 'Who coached TNT during their 2011 Grand Slam?', a: ['Norman Black','Chot Reyes','Jong Uichico','Yeng Guiao'], c: 1 },
    { q: 'Who was the 2005 PBA MVP?', a: ['Willie Miller','Kerby Raymundo','Asi Taulava','Mark Caguioa'], c: 0 },
    { q: 'Jayjay Helterbrand and Mark Caguioa were nicknamed?', a: ['The Twin Towers','The Fast and the Furious','The Batman Duo','The PBA Boys'], c: 1 },
    { q: 'Which import was called "The Assassin" in PBA?', a: ['Bobby Parks','Sean Chambers','Norman Black','Allen Durham'], c: 1 }
  ],
  /* Tier 8 */
  [
    { q: 'How many Best Import awards did Bobby Parks win?', a: ['5','6','7','4'], c: 2 },
    { q: 'Sean Chambers played primarily for which franchise?', a: ['Alaska Milkmen','San Miguel','Purefoods','Shell'], c: 0 },
    { q: 'Which coach won PBA titles across four different decades?', a: ['Tim Cone','Virgilio "Baby" Dalupan','Yeng Guiao','Chot Reyes'], c: 0 },
    { q: 'Who is the all-time leading scorer in PBA history?', a: ['Alvin Patrimonio','Ramon Fernandez','Allan Caidic','Mon Fernandez'], c: 1 },
    { q: 'Which team was formerly known as the "Purefoods Hotdogs"?', a: ['Magnolia','Rain or Shine','Meralco','Barako Bull'], c: 0 }
  ],
  /* Tier 9 */
  [
    { q: 'In what year did the PBA hold its very first Finals game?', a: ['1975','1976','1974','1977'], c: 0 },
    { q: 'Ramon Fernandez won a record how many regular-season MVPs?', a: ['3','4','5','2'], c: 1 },
    { q: 'Which import dominated Red Bull in the early 2000s, winning Best Import twice?', a: ['Antonio Lang','Sean Lampley','Kelly Williams','Cyrus Baguio'], c: 0 },
    { q: 'Which team won the 1989-90 All-Filipino and the first three All-Filipino titles of the decade?', a: ['Shell','Alaska','Purefoods','San Miguel'], c: 3 },
    { q: 'Who was nicknamed "Skywalker"?', a: ['Samboy Lim','Benjie Paras','Alvin Patrimonio','Vergel Meneses'], c: 0 }
  ],
  /* Tier 10 — second safe level (512 credits) */
  [
    { q: 'Which player owns the single-game PBA scoring record?', a: ['Allan Caidic','Tony Harris','Lamont Strothers','Billy Ray Bates'], c: 2 },
    { q: 'Lamont Strothers set the single-game scoring record with how many points?', a: ['100','105','110','89'], c: 0 },
    { q: 'Which coach has the most championship titles in PBA history?', a: ['Tim Cone','Baby Dalupan','Yeng Guiao','Chot Reyes'], c: 0 },
    { q: 'Who was the PBA\'s first-ever 1st-overall draft pick?', a: ['Jun Limpot','Dwight Lago','Bong Hawkins','Ato Agustin'], c: 0 },
    { q: 'Which team retired jersey #7 for Robert Jaworski?', a: ['Ginebra','Toyota','Crispa','Barangay Ginebra'], c: 3 }
  ],
  /* Tier 11 */
  [
    { q: 'Which PBA team was the first sponsored by a non-Filipino parent company?', a: ['Pepsi','Mitsubishi','N/A - none','Toyota'], c: 3 },
    { q: 'How many points did Allan Caidic score in his famous 1991 outburst?', a: ['79','82','76','85'], c: 0 },
    { q: 'Which of these players won Rookie of the Year AND MVP in the same year?', a: ['Benjie Paras','June Mar Fajardo','Kiefer Ravena','Both A and B'], c: 3 },
    { q: 'Which team won the 1998 Commissioner\'s Cup?', a: ['Alaska','Pop Cola','Mobiline','San Miguel'], c: 1 },
    { q: 'Who holds the record for most PBA Finals MVP awards?', a: ['Ramon Fernandez','June Mar Fajardo','Alvin Patrimonio','James Yap'], c: 1 }
  ],
  /* Tier 12 */
  [
    { q: 'The "Never Say Die" moniker is most associated with which team and era?', a: ['Ginebra in the 80s','Alaska in the 90s','Toyota in the 70s','TNT in the 2010s'], c: 0 },
    { q: 'Who was the first player to be voted MVP unanimously in PBA history?', a: ['June Mar Fajardo','Alvin Patrimonio','Ramon Fernandez','Benjie Paras'], c: 3 },
    { q: 'Which commissioner instituted the PBA rookie draft?', a: ['Rudy Salud','Leo Prieto','Mariano Yenko','Jun Bernardino'], c: 2 },
    { q: 'Which team drafted Samboy Lim in 1983?', a: ['Manila Beer','Tanduay','San Miguel','Great Taste'], c: 2 },
    { q: 'Asi Taulava\'s rookie year was which season?', a: ['1999','2000','2001','1998'], c: 0 }
  ],
  /* Tier 13 — third safe level (4,096 credits) */
  [
    { q: 'Who coached Great Taste to their 1984 Grand Slam?', a: ['Baby Dalupan','Tommy Manotoc','Fort Acuña','Turo Valenzona'], c: 0 },
    { q: 'Which import was known as the "Black Superman" in the PBA?', a: ['Billy Ray Bates','Michael Hackett','Norman Black','Willie Pearson'], c: 0 },
    { q: 'Billy Ray Bates won his Best Import trophy in which year?', a: ['1983','1981','1986','1979'], c: 1 },
    { q: 'How many points did Tony Harris score in his highest PBA game?', a: ['100','105','95','87'], c: 1 },
    { q: 'Who is the all-time career rebound leader in the PBA?', a: ['Abet Guidaben','Alvin Patrimonio','Marlou Aquino','Ramon Fernandez'], c: 3 }
  ],
  /* Tier 14 */
  [
    { q: 'Who wore jersey #14 throughout his career with Crispa and served as team captain?', a: ['Bogs Adornado','Philip Cezar','Atoy Co','Freddie Hubalde'], c: 2 },
    { q: 'Which team drafted Alvin Patrimonio first-overall in 1988?', a: ['Purefoods Hotdogs','Shell','San Miguel','Alaska'], c: 0 },
    { q: 'Who was the first foreign-born coach to win a PBA title?', a: ['Norman Black','Tim Cone','Ron Jacobs','Turo Valenzona'], c: 2 },
    { q: 'Which team\'s colors are maroon and gold?', a: ['Magnolia','Phoenix','Barako Bull','Meralco'], c: 0 },
    { q: 'Mon Fernandez once scored how many career PBA points (closest)?', a: ['16,782','18,996','14,220','21,050'], c: 1 }
  ],
  /* Tier 15 — nearly unanswerable deep-cut */
  [
    { q: 'Which player holds the PBA record for most career triple-doubles?', a: ['Asi Taulava','Kelly Williams','Marlou Aquino','Benjie Paras'], c: 1 },
    { q: 'The very first PBA game was played on what exact date?', a: ['April 9, 1975','March 30, 1975','June 15, 1975','May 1, 1975'], c: 0 },
    { q: 'Who scored the first-ever basket in the PBA?', a: ['Ramon Fernandez','Bogs Adornado','Atoy Co','Orly Castelo'], c: 2 },
    { q: 'Which import pairing was known as the "Twin Towers" for Shell in the late 1980s?', a: ['Cornelius Thompson and Jervis Cole','Ricky Brown and David Thirdkill','Norman Black and Billy Ray Bates','Bobby Parks and Sean Chambers'], c: 0 },
    { q: 'In which year did the PBA play a Founder\'s Cup as the mid-season conference?', a: ['2004','2001','1997','Never'], c: 0 }
  ]
];

/* Era-specific banks keep the classic feel for filtered games. When an era is
   chosen, we use that bank for ALL 15 levels (may repeat easier questions). */
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

/* ------------ Constants ------------ */
const CREDIT_LADDER = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];
// 1-indexed Q# that are "locked in": once you pass them, you can't drop below
const SAFE_LEVELS = [5, 10, 13]; // Q5 = 16, Q10 = 512, Q13 = 4096
const TOTAL_Q = 15;
const TIMER_SEC = 15;
const TIMER_CIRC = 2 * Math.PI * 45;

const FAKE_WEEKLY_LEADERS = [
  { name: 'CrispaForLife', score: 8192 },
  { name: 'MangLaro88',    score: 4096 },
  { name: 'TondoHoops',    score: 2048 },
  { name: 'TamarawTime',   score: 1024 },
  { name: 'CebuCourt',     score: 512 },
  { name: 'BanetJr',       score: 256 },
  { name: 'KrakenFan15',   score: 128 }
];

/* ------------ State ------------ */
let currentDeck = [];
let qIdx = 0;          // 0-based index
let correctCount = 0;
let timer = TIMER_SEC;
let timerInterval = null;
let answered = false;
let gameActive = false;
let blurHandlerAttached = false;

/* ------------ Helpers ------------ */
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

function buildDeck(category) {
  if (category === 'mixed') {
    // Sample one question from each difficulty tier
    return TRIVIA_TIERS.map(tier => shuffle(tier)[0]);
  } else {
    const pool = TRIVIA_BANK[category] || TRIVIA_BANK['1970s'];
    // Repeat/reshuffle the era pool to get 15 questions
    const deck = [];
    while (deck.length < TOTAL_Q) deck.push(...shuffle(pool));
    return deck.slice(0, TOTAL_Q);
  }
}

function getStats() {
  return JSON.parse(localStorage.getItem('aeob-trivia-stats') || '{"best":0,"played":0,"points":0,"recent":[]}');
}
function saveStats(s) { localStorage.setItem('aeob-trivia-stats', JSON.stringify(s)); }

function updateStatsDisplay() {
  const s = getStats();
  document.getElementById('trivBest').textContent = s.best.toLocaleString();
  document.getElementById('trivPlayed').textContent = s.played.toLocaleString();
  document.getElementById('trivPoints').textContent = s.points.toLocaleString();
  const combined = [...FAKE_WEEKLY_LEADERS, { name: 'You', score: s.best, isYou: true }]
    .sort((a, b) => b.score - a.score);
  const rank = combined.findIndex(x => x.isYou) + 1;
  document.getElementById('trivRank').textContent = s.best > 0 ? '#' + rank : '—';
}

// Credits locked in if you miss at question index `idx` (0-based)
function lastSafeCredits(idx) {
  // Find the highest safe level you've already passed BEFORE answering idx
  let locked = 0;
  for (const lvl of SAFE_LEVELS) {
    if (idx >= lvl) locked = CREDIT_LADDER[lvl - 1];
  }
  return locked;
}

function creditsForIdx(idx) { return CREDIT_LADDER[idx] || 0; }

/* ------------ Screens ------------ */
function showScreen(id) {
  document.querySelectorAll('.trivia-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ------------ Ladder ------------ */
function renderLadder() {
  const el = document.getElementById('trivLadder');
  if (!el) return;
  const rows = [];
  for (let i = TOTAL_Q - 1; i >= 0; i--) {
    const level = i + 1;
    const isCurrent = i === qIdx;
    const isPassed = i < qIdx;
    const isSafe = SAFE_LEVELS.includes(level);
    const isTop = level === TOTAL_Q;
    rows.push(`
      <div class="ladder-row${isCurrent ? ' current' : ''}${isPassed ? ' passed' : ''}${isSafe ? ' safe' : ''}${isTop ? ' top' : ''}">
        <span class="ladder-num">${level}</span>
        <span class="ladder-credits">${CREDIT_LADDER[i].toLocaleString()}</span>
        ${isSafe ? '<span class="ladder-safe" title="Safe level">🔒</span>' : ''}
      </div>
    `);
  }
  el.innerHTML = '<div class="ladder-title">PRIZE LADDER</div>' + rows.join('');
}

/* ------------ Game Flow ------------ */
function startGame() {
  const cat = document.getElementById('trivCategory').value;
  currentDeck = buildDeck(cat);
  qIdx = 0;
  correctCount = 0;
  gameActive = true;
  document.getElementById('trivScoreLive').textContent = '1';
  attachAntiCheat();
  showScreen('screenPlaying');
  renderLadder();
  renderQuestion();
}

function renderQuestion() {
  const q = currentDeck[qIdx];
  if (!q) { endGame('won'); return; }
  answered = false;
  timer = TIMER_SEC;

  document.getElementById('trivQnum').textContent = qIdx + 1;
  document.getElementById('trivQuestion').textContent = q.q;
  document.getElementById('trivTimer').textContent = timer;
  document.getElementById('trivScoreLive').textContent = creditsForIdx(qIdx).toLocaleString();

  const circle = document.getElementById('trivTimerCircle');
  circle.style.strokeDasharray = TIMER_CIRC;
  circle.style.strokeDashoffset = 0;
  circle.style.stroke = 'var(--orange-accent)';

  // Randomize option order but track the original correct index
  const pairs = q.a.map((opt, i) => ({ opt, i }));
  const shuffled = shuffle(pairs);
  const container = document.getElementById('trivOptions');
  container.innerHTML = shuffled.map((o, i) => `
    <button class="trivia-option" data-idx="${o.i}">
      <span class="t-option-letter">${String.fromCharCode(65 + i)}</span>
      <span class="t-option-label">${o.opt}</span>
    </button>
  `).join('');

  container.querySelectorAll('.trivia-option').forEach(btn => {
    btn.addEventListener('click', () => selectAnswer(parseInt(btn.dataset.idx, 10), btn));
  });

  renderLadder();
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  const circle = document.getElementById('trivTimerCircle');
  timerInterval = setInterval(() => {
    timer -= 0.1;
    const pct = Math.max(0, timer / TIMER_SEC);
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
  if (answered || !gameActive) return;
  answered = true;
  clearInterval(timerInterval);
  const q = currentDeck[qIdx];
  const buttons = document.querySelectorAll('.trivia-option');

  const isCorrect = idx === q.c;

  buttons.forEach(b => {
    const bidx = parseInt(b.dataset.idx, 10);
    if (bidx === q.c) b.classList.add('correct');
    else if (bidx === idx) b.classList.add('wrong');
    b.disabled = true;
  });

  if (isCorrect) {
    correctCount++;
    setTimeout(() => {
      qIdx++;
      if (qIdx >= TOTAL_Q) endGame('won');
      else renderQuestion();
    }, 1400);
  } else {
    setTimeout(() => endGame('lost'), 1400);
  }
}

function walkAway() {
  if (!gameActive || answered) return;
  clearInterval(timerInterval);
  endGame('walk');
}

function endGame(reason) {
  gameActive = false;
  clearInterval(timerInterval);
  detachAntiCheat();

  let banked = 0;
  let outcome = '—';
  let title = 'Game Over';
  let icon = '&#128284;'; // no-entry sign
  let sub = '';

  if (reason === 'won') {
    banked = CREDIT_LADDER[TOTAL_Q - 1]; // max prize
    outcome = 'Perfect Run';
    title = 'PBA Millionaire!';
    icon = '&#127942;';
    sub = `You answered all ${TOTAL_Q} correct. Legendary.`;
  } else if (reason === 'walk') {
    // Walk away keeps the credits of the LAST CORRECTLY ANSWERED question.
    banked = qIdx > 0 ? CREDIT_LADDER[qIdx - 1] : 0;
    outcome = 'Walked Away';
    title = 'Smart Exit';
    icon = '&#128176;';
    sub = `You cashed out at Q${qIdx} with ${banked.toLocaleString()} credits.`;
  } else if (reason === 'lost') {
    banked = lastSafeCredits(qIdx);
    outcome = 'Wrong Answer';
    title = banked > 0 ? 'Dropped to Safe Level' : 'No Safety Net';
    icon = banked > 0 ? '&#128274;' : '&#128165;';
    sub = banked > 0
      ? `You missed Q${qIdx + 1}, but the safe level guarantees ${banked.toLocaleString()} credits.`
      : `Missed before reaching a safe level. No credits banked.`;
  } else if (reason === 'cheat') {
    banked = 0;
    outcome = 'Anti-Cheat Triggered';
    title = 'Game Forfeited';
    icon = '&#128683;';
    sub = 'Tab switch or window blur detected. Keep your eyes on the court.';
  }

  const stats = getStats();
  stats.played++;
  stats.points += banked;
  if (banked > stats.best) stats.best = banked;
  stats.recent.unshift({
    score: banked,
    correct: correctCount,
    reachedLevel: qIdx + 1,
    outcome,
    date: Date.now()
  });
  stats.recent = stats.recent.slice(0, 5);
  saveStats(stats);

  document.getElementById('trivFinalScore').textContent = banked.toLocaleString();
  document.getElementById('trivFinalCorrect').textContent = correctCount + ' / ' + TOTAL_Q;
  document.getElementById('trivFinalLevel').textContent = 'Q' + Math.min(qIdx + (reason === 'won' ? 0 : 1), TOTAL_Q);
  document.getElementById('trivFinalOutcome').textContent = outcome;
  document.getElementById('trivResultTitle').textContent = title;
  document.getElementById('trivResultIcon').innerHTML = icon;
  document.getElementById('trivResultSub').textContent = sub;

  showScreen('screenResult');
  updateStatsDisplay();
  renderLeaderboard();
  renderPastGames();
}

/* ------------ Anti-cheat ------------ */
function onBlur() {
  if (gameActive && !answered) endGame('cheat');
}
function onVisibilityChange() {
  if (document.hidden && gameActive && !answered) endGame('cheat');
}
function onCopy(e) {
  if (gameActive) { e.preventDefault(); e.stopPropagation(); }
}
function attachAntiCheat() {
  if (blurHandlerAttached) return;
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('copy', onCopy, true);
  blurHandlerAttached = true;
}
function detachAntiCheat() {
  window.removeEventListener('blur', onBlur);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  document.removeEventListener('copy', onCopy, true);
  blurHandlerAttached = false;
}

/* ------------ Leaderboard / history ------------ */
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
      <div class="trivia-lb-score">${f.score.toLocaleString()}</div>
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
      <div class="pg-score">${(g.score || 0).toLocaleString()}</div>
      <div class="pg-info">
        <div>Q${g.reachedLevel || 0} &middot; ${g.correct || 0} correct &middot; ${g.outcome || '—'}</div>
        <div class="muted-sm">${date.toLocaleDateString()} ${date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</div>
      </div>
    </div>`;
  }).join('');
}

/* ------------ Weekly countdown ------------ */
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

/* ------------ Bindings ------------ */
document.getElementById('startTrivia')?.addEventListener('click', startGame);
document.getElementById('playAgainBtn')?.addEventListener('click', () => showScreen('screenIntro'));
document.getElementById('walkAwayBtn')?.addEventListener('click', walkAway);
document.getElementById('shareResultBtn')?.addEventListener('click', () => {
  const scoreEl = document.getElementById('trivFinalScore');
  const score = scoreEl ? scoreEl.textContent : '0';
  const text = `I banked ${score} credits on AEOB PBA Millionaire. Can you climb the ladder?`;
  if (navigator.share) {
    navigator.share({ title: 'AEOB PBA Millionaire', text, url: location.href });
  } else {
    navigator.clipboard?.writeText(text + ' ' + location.href);
    const t = document.getElementById('toast');
    if (t) { t.textContent = 'Result copied to clipboard!'; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500); }
  }
});

/* ------------ Init ------------ */
updateStatsDisplay();
renderLeaderboard();
renderPastGames();
updateLbCountdown();
setInterval(updateLbCountdown, 60000);
