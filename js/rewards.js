/* ============================================
   AEOB — Rewards Module
   Handles: points display, tier progression,
   activity log, rewards catalog
   ============================================ */

const Rewards = (() => {
  // Tier definitions
  const TIERS = [
    { name: 'Rookie', min: 0, max: 249, class: 'tier-rookie' },
    { name: 'Veteran', min: 250, max: 749, class: 'tier-veteran' },
    { name: 'All-Star', min: 750, max: 1499, class: 'tier-allstar' },
    { name: 'Legend', min: 1500, max: Infinity, class: 'tier-legend' }
  ];

  // Point values
  const POINT_VALUES = {
    watch: 10,
    prediction_vote: 15,
    submission: 20,
    featured: 100,
    streak_7: 50,
    referral: 25,
    favorite: 5
  };

  // ---------- State ----------
  let totalPoints = 0;
  let activities = [];

  // ---------- Load Local State ----------
  function loadState() {
    const stored = localStorage.getItem('aeob-rewards');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        totalPoints = data.points || 0;
        activities = data.activities || [];
      } catch (e) {
        totalPoints = 0;
        activities = [];
      }
    }
  }

  function saveState() {
    localStorage.setItem('aeob-rewards', JSON.stringify({
      points: totalPoints,
      activities: activities.slice(0, 50) // Keep last 50
    }));
  }

  // ---------- Get Tier ----------
  function getTier(points) {
    return TIERS.find(t => points >= t.min && points <= t.max) || TIERS[0];
  }

  function getNextTier(points) {
    const currentTierIndex = TIERS.findIndex(t => points >= t.min && points <= t.max);
    if (currentTierIndex < TIERS.length - 1) {
      return TIERS[currentTierIndex + 1];
    }
    return null;
  }

  // ---------- Add Points ----------
  function addPoints(action, points) {
    totalPoints += points;
    activities.unshift({
      action,
      points,
      timestamp: new Date().toISOString()
    });
    saveState();
    updateDashboard();
  }

  // ---------- Update Dashboard ----------
  function updateDashboard() {
    const tier = getTier(totalPoints);
    const nextTier = getNextTier(totalPoints);

    // Points circle
    const ptsEl = document.querySelector('.points-circle .pts');
    if (ptsEl) ptsEl.textContent = totalPoints;

    // Tier badge
    const badgeEl = document.querySelector('.tier-badge');
    if (badgeEl) {
      badgeEl.textContent = tier.name;
      badgeEl.className = `tier-badge ${tier.class}`;
    }

    // Progress bar
    const progressFill = document.querySelector('.tier-progress .fill');
    const progressText = document.querySelector('.rewards-sidebar .tier-progress + p, .rewards-sidebar small');
    if (progressFill && nextTier) {
      const tierRange = tier.max - tier.min + 1;
      const progress = ((totalPoints - tier.min) / tierRange) * 100;
      progressFill.style.width = `${Math.min(progress, 100)}%`;
    } else if (progressFill) {
      progressFill.style.width = '100%';
    }

    // Points to next tier text
    const tierInfoEl = document.getElementById('tierInfo');
    if (tierInfoEl && nextTier) {
      tierInfoEl.textContent = `${nextTier.min - totalPoints} points to ${nextTier.name}`;
    } else if (tierInfoEl) {
      tierInfoEl.textContent = 'Maximum tier reached!';
    }

    // Activity list
    renderActivities();
  }

  // ---------- Render Activities ----------
  function renderActivities() {
    const container = document.querySelector('.activity-list');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128200;</div>
          <h3>No activity yet</h3>
          <p>Start watching episodes, making predictions, and submitting questions to earn points!</p>
        </div>
      `;
      return;
    }

    const icons = {
      watch: '&#127909;',
      prediction_vote: '&#127942;',
      submission: '&#128172;',
      featured: '&#11088;',
      streak_7: '&#128293;',
      referral: '&#129309;',
      favorite: '&#10084;'
    };

    const labels = {
      watch: 'Watched an episode',
      prediction_vote: 'Voted on a prediction',
      submission: 'Submitted a question',
      featured: 'Submission featured on show!',
      streak_7: '7-day listening streak!',
      referral: 'Referred a friend',
      favorite: 'Saved a favorite episode'
    };

    container.innerHTML = activities.slice(0, 10).map(act => `
      <div class="activity-item">
        <div class="activity-icon">${icons[act.action] || '&#128310;'}</div>
        <div class="activity-info">
          <div class="desc">${labels[act.action] || act.action}</div>
          <div class="time">${window.formatDate ? window.formatDate(act.timestamp) : ''}</div>
        </div>
        <div class="activity-pts">+${act.points} pts</div>
      </div>
    `).join('');
  }

  // ---------- Redeem Reward ----------
  async function redeem(rewardId, cost) {
    if (!window.Auth?.isLoggedIn()) {
      window.Auth?.openModal();
      return;
    }

    if (totalPoints < cost) {
      window.showToast(`You need ${cost - totalPoints} more points for this reward`, 'error');
      return;
    }

    // Confirm
    if (!confirm(`Redeem this reward for ${cost} points?`)) return;

    totalPoints -= cost;
    activities.unshift({
      action: 'redeem',
      points: -cost,
      timestamp: new Date().toISOString()
    });
    saveState();
    updateDashboard();
    window.showToast('Reward redeemed! Check your email for details.', 'success');
  }

  // ---------- Bind Redeem Buttons ----------
  function bindRedeemButtons() {
    document.querySelectorAll('[data-redeem]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cost = parseInt(btn.dataset.cost);
        const rewardId = btn.dataset.redeem;
        redeem(rewardId, cost);
      });
    });
  }

  // ---------- Auth State Listener ----------
  window.addEventListener('authStateChanged', (e) => {
    const { loggedIn } = e.detail;
    const dashboard = document.getElementById('rewardsDashboardSection');
    const loginRequired = document.getElementById('loginRequiredSection');

    if (dashboard) dashboard.style.display = loggedIn ? '' : 'none';
    if (loginRequired) loginRequired.style.display = loggedIn ? 'none' : '';

    if (loggedIn) {
      loadState();
      updateDashboard();
    }
  });

  // ---------- Init ----------
  function init() {
    loadState();

    // Show/hide dashboard based on auth state
    const isLoggedIn = window.Auth?.isLoggedIn();
    const dashboard = document.getElementById('rewardsDashboardSection');
    const loginRequired = document.getElementById('loginRequiredSection');

    if (dashboard) dashboard.style.display = isLoggedIn ? '' : 'none';
    if (loginRequired) loginRequired.style.display = isLoggedIn ? 'none' : '';

    if (isLoggedIn) {
      updateDashboard();
    }

    bindRedeemButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { addPoints, redeem, getTier, TIERS, POINT_VALUES };
})();

window.Rewards = Rewards;
