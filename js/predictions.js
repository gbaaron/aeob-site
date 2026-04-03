/* ============================================
   AEOB — Predictions Module
   Handles: leaderboard display, prediction voting,
   fan picks, and accuracy tracking
   ============================================ */

const Predictions = (() => {
  let predictions = [];
  let userVotes = {};

  // ---------- Load Saved Votes ----------
  function loadVotes() {
    const stored = localStorage.getItem('aeob-votes');
    if (stored) {
      try { userVotes = JSON.parse(stored); } catch (e) { userVotes = {}; }
    }
  }

  function saveVotes() {
    localStorage.setItem('aeob-votes', JSON.stringify(userVotes));
  }

  // ---------- Fetch Predictions ----------
  async function fetchPredictions() {
    try {
      const data = await window.apiFetch('predictions-list');
      return data.predictions || [];
    } catch (err) {
      // Return demo predictions
      return getDemoPredictions();
    }
  }

  // ---------- Demo Data ----------
  function getDemoPredictions() {
    return [
      {
        id: 'pred-1',
        question: 'PLACEHOLDER: Which team had the most dominant dynasty in PBA history?',
        status: 'active',
        picks: [
          { host: 'Charlie Cuna', pick: 'Crispa Redmanizers' },
          { host: 'Sid Ventura', pick: 'San Miguel Beermen' },
          { host: 'Noel Zarate', pick: 'Toyota Tamaraws' },
          { host: 'Jay Mercado', pick: 'Alaska Milkmen' }
        ],
        agreeCount: 47,
        disagreeCount: 23
      },
      {
        id: 'pred-2',
        question: 'PLACEHOLDER: Who was the greatest import in PBA history?',
        status: 'active',
        picks: [
          { host: 'Charlie Cuna', pick: 'PLACEHOLDER: Import Name A' },
          { host: 'Sid Ventura', pick: 'PLACEHOLDER: Import Name B' },
          { host: 'Noel Zarate', pick: 'PLACEHOLDER: Import Name A' },
          { host: 'Jay Mercado', pick: 'PLACEHOLDER: Import Name C' }
        ],
        agreeCount: 62,
        disagreeCount: 31
      },
      {
        id: 'pred-3',
        question: 'PLACEHOLDER: Would the 1983 Crispa team beat the 1989 San Miguel team in a best-of-7?',
        status: 'active',
        picks: [
          { host: 'Charlie Cuna', pick: 'Crispa in 6' },
          { host: 'Sid Ventura', pick: 'San Miguel in 7' },
          { host: 'Noel Zarate', pick: 'Crispa in 5' },
          { host: 'Jay Mercado', pick: 'San Miguel in 6' }
        ],
        agreeCount: 55,
        disagreeCount: 44
      }
    ];
  }

  // ---------- Render Predictions ----------
  function renderPredictions(container) {
    if (!container) return;
    const cards = predictions.map(pred => {
      const voted = userVotes[pred.id];
      return `
        <div class="card prediction-card" data-id="${pred.id}">
          <div class="question">${pred.question}</div>
          <div class="host-picks">
            ${pred.picks.map(p => `
              <div class="host-pick">
                <span class="host-name">${p.host}</span>
                <span>${p.pick}</span>
              </div>
            `).join('')}
          </div>
          <div class="vote-btns">
            <button class="vote-btn ${voted === 'agree' ? 'voted' : ''}" onclick="Predictions.vote('${pred.id}', 'agree')">
              &#128077; Agree (${pred.agreeCount + (voted === 'agree' ? 1 : 0)})
            </button>
            <button class="vote-btn ${voted === 'disagree' ? 'voted' : ''}" onclick="Predictions.vote('${pred.id}', 'disagree')">
              &#128078; Disagree (${pred.disagreeCount + (voted === 'disagree' ? 1 : 0)})
            </button>
          </div>
        </div>
      `;
    });
    container.innerHTML = cards.join('');
  }

  // ---------- Vote ----------
  async function vote(predictionId, choice) {
    if (!window.Auth?.isLoggedIn()) {
      window.Auth?.openModal();
      window.showToast('Sign in to vote on predictions', 'info');
      return;
    }

    if (userVotes[predictionId]) {
      window.showToast('You already voted on this prediction', 'info');
      return;
    }

    userVotes[predictionId] = choice;
    saveVotes();

    // Send to server
    try {
      await window.apiFetch('predictions-vote', {
        method: 'POST',
        body: JSON.stringify({ predictionId, choice })
      });
    } catch (e) {
      // Continue with local state even if server fails
    }

    // Award points
    try {
      await window.apiFetch('rewards-log', {
        method: 'POST',
        body: JSON.stringify({ action: 'prediction_vote', points: 15 })
      });
    } catch (e) {}

    window.showToast('Vote recorded! +15 points', 'success');

    // Re-render
    const container = document.getElementById('activePredictions') || document.getElementById('featuredPicks')?.parentElement;
    if (container) renderPredictions(container);
  }

  // ---------- Render Leaderboard ----------
  function renderLeaderboard() {
    const tbody = document.querySelector('.leaderboard-table tbody');
    if (!tbody) return;

    // Demo leaderboard data
    const hosts = [
      { name: 'Charlie Cuna', correct: 42, total: 68, rank: 1 },
      { name: 'Noel Zarate', correct: 38, total: 68, rank: 2 },
      { name: 'Jay Mercado', correct: 35, total: 65, rank: 3 },
      { name: 'Sid Ventura', correct: 33, total: 68, rank: 4 }
    ];

    tbody.innerHTML = hosts.map(h => {
      const pct = Math.round((h.correct / h.total) * 100);
      const rankClass = h.rank === 1 ? 'gold' : h.rank === 2 ? 'silver' : h.rank === 3 ? 'bronze' : '';
      return `
        <tr>
          <td class="leaderboard-rank ${rankClass}">${h.rank}</td>
          <td><strong>${h.name}</strong></td>
          <td>${h.correct}</td>
          <td>${h.total}</td>
          <td>${pct}%</td>
          <td>
            <div class="accuracy-bar">
              <div class="fill" style="width:${pct}%"></div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ---------- Featured Prediction (Homepage) ----------
  function renderFeatured() {
    const questionEl = document.getElementById('featuredPrediction');
    const picksEl = document.getElementById('featuredPicks');
    const votesEl = document.getElementById('featuredVotes');
    if (!questionEl || predictions.length === 0) return;

    const pred = predictions[0];
    const voted = userVotes[pred.id];

    questionEl.textContent = pred.question;
    picksEl.innerHTML = pred.picks.map(p => `
      <div class="host-pick">
        <span class="host-name">${p.host}</span>
        <span>${p.pick}</span>
      </div>
    `).join('');

    votesEl.innerHTML = `
      <button class="vote-btn ${voted === 'agree' ? 'voted' : ''}" onclick="Predictions.vote('${pred.id}', 'agree')">
        &#128077; Agree (${pred.agreeCount + (voted === 'agree' ? 1 : 0)})
      </button>
      <button class="vote-btn ${voted === 'disagree' ? 'voted' : ''}" onclick="Predictions.vote('${pred.id}', 'disagree')">
        &#128078; Disagree (${pred.disagreeCount + (voted === 'disagree' ? 1 : 0)})
      </button>
    `;
  }

  // ---------- Init ----------
  async function init() {
    loadVotes();
    predictions = await fetchPredictions();

    // Predictions page
    const activePredContainer = document.getElementById('activePredictions');
    if (activePredContainer) renderPredictions(activePredContainer);

    renderLeaderboard();

    // Homepage featured prediction
    renderFeatured();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { vote, renderPredictions, renderLeaderboard };
})();

window.Predictions = Predictions;
