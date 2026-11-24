/* ============================================
   AEOB — Fan Submissions Module
   Handles: submit questions/scenarios,
   upvoting, featured submissions display
   ============================================ */

const Submissions = (() => {
  let submissions = [];
  let userUpvotes = new Set();

  // DOM
  const form = document.querySelector('.submission-form form') || document.querySelector('.submission-form');
  const submissionsList = document.querySelector('.submissions-list');
  const charCount = document.querySelector('.char-count');
  const descTextarea = document.getElementById('submissionDesc') || document.querySelector('.submission-form textarea');

  // ---------- Load State ----------
  function loadUpvotes() {
    const stored = localStorage.getItem('aeob-upvotes');
    if (stored) {
      try { userUpvotes = new Set(JSON.parse(stored)); } catch (e) {}
    }
  }

  function saveUpvotes() {
    localStorage.setItem('aeob-upvotes', JSON.stringify([...userUpvotes]));
  }

  // ---------- Fetch Submissions ----------
  async function fetchSubmissions() {
    try {
      const data = await window.apiFetch('submissions-list');
      return data.submissions || [];
    } catch (err) {
      return getDemoSubmissions();
    }
  }

  // No invented fan posts: when the feed is down the page shows its empty state.
  function getDemoSubmissions() {
    return [];
  }

  // ---------- Render Submissions ----------
  function renderSubmissions(container, items) {
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i data-lucide="message-circle"></i></div>
          <h3>No submissions yet</h3>
          <p>Be the first to submit a question or scenario!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(sub => {
      const isUpvoted = userUpvotes.has(sub.id);
      const typeLabel = sub.type === 'what-if' ? 'What If' : sub.type === 'stats-challenge' ? 'Stats Challenge' : 'Question';
      return `
        <div class="card submission-item" data-id="${sub.id}">
          <div class="submission-votes">
            <button class="${isUpvoted ? 'upvoted' : ''}" onclick="Submissions.upvote('${sub.id}')">&#9650;</button>
            <span class="count">${sub.votes + (isUpvoted ? 1 : 0)}</span>
          </div>
          <div class="submission-content">
            <span class="type-badge ${sub.featured ? 'featured-badge' : ''}">${sub.featured ? '<i data-lucide="star"></i> Featured' : typeLabel}</span>
            <h4>${sub.title}</h4>
            <p>${sub.description}</p>
            <div class="episode-meta" style="margin-top:8px;">
              <span>by ${sub.author}</span>
              <span>${window.formatDate(sub.createdAt)}</span>
              ${sub.featured && sub.featuredEpisode ? `<span><i data-lucide="mic"></i> ${sub.featuredEpisode}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ---------- Upvote ----------
  async function upvote(submissionId) {
    if (!window.Auth?.isLoggedIn()) {
      window.Auth?.openModal();
      window.showToast('Sign in to vote on submissions', 'info');
      return;
    }

    if (userUpvotes.has(submissionId)) {
      userUpvotes.delete(submissionId);
      window.showToast('Vote removed', 'info');
    } else {
      userUpvotes.add(submissionId);
      window.showToast('Upvoted!', 'success');
    }

    saveUpvotes();

    // Re-render
    const allContainer = document.getElementById('topSubmissions') || submissionsList;
    if (allContainer) {
      const sorted = [...submissions].sort((a, b) => {
        const aVotes = b.votes + (userUpvotes.has(b.id) ? 1 : 0);
        const bVotes = a.votes + (userUpvotes.has(a.id) ? 1 : 0);
        return aVotes - bVotes;
      });
      renderSubmissions(allContainer, sorted);
    }
  }

  // ---------- Submit New ----------
  async function submitNew(type, title, description) {
    if (!window.Auth?.isLoggedIn()) {
      window.Auth?.openModal();
      return;
    }

    try {
      const data = await window.apiFetch('submissions-create', {
        method: 'POST',
        body: JSON.stringify({ type, title, description })
      });

      window.showToast('Submission sent! +20 points', 'success');

      // Award points
      try {
        await window.apiFetch('rewards-log', {
          method: 'POST',
          body: JSON.stringify({ action: 'submission', points: 20 })
        });
      } catch (e) {}

      // Refresh
      submissions = await fetchSubmissions();
      const container = document.getElementById('topSubmissions') || submissionsList;
      if (container) renderSubmissions(container, submissions);

    } catch (err) {
      window.showToast('Failed to submit. Please try again.', 'error');
    }
  }

  // ---------- Character Count ----------
  if (descTextarea && charCount) {
    descTextarea.addEventListener('input', () => {
      const len = descTextarea.value.length;
      const max = descTextarea.maxLength || 500;
      charCount.textContent = `${len} / ${max}`;
    });
  }

  // ---------- Form Submit ----------
  function bindForm() {
    const submitBtn = document.querySelector('.submission-form .btn-primary');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();

      const typeSelect = document.getElementById('submissionType') || document.querySelector('.submission-form select');
      const titleInput = document.getElementById('submissionTitle') || document.querySelector('.submission-form input[type="text"]');
      const descInput = descTextarea;

      if (!typeSelect?.value || !titleInput?.value?.trim() || !descInput?.value?.trim()) {
        window.showToast('Please fill in all fields', 'error');
        return;
      }

      submitNew(typeSelect.value, titleInput.value.trim(), descInput.value.trim());

      // Clear form
      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
      if (charCount) charCount.textContent = '0 / 500';
    });
  }

  // ---------- Init ----------
  async function init() {
    loadUpvotes();
    submissions = await fetchSubmissions();

    // Top submissions tab
    const topContainer = document.getElementById('topSubmissions') || submissionsList;
    if (topContainer) {
      const sorted = [...submissions].sort((a, b) => b.votes - a.votes);
      renderSubmissions(topContainer, sorted);
    }

    // Featured tab
    const featuredContainer = document.getElementById('featuredSubmissions');
    if (featuredContainer) {
      const featured = submissions.filter(s => s.featured);
      renderSubmissions(featuredContainer, featured);
    }

    bindForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { upvote, submitNew };
})();

window.Submissions = Submissions;
