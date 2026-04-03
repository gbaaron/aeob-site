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

  function getDemoSubmissions() {
    return [
      {
        id: 'sub-1',
        type: 'what-if',
        title: 'PLACEHOLDER: What if Crispa never disbanded?',
        description: 'PLACEHOLDER: Discussion about how PBA history would have changed if the Crispa Redmanizers continued playing into the late 1980s.',
        author: 'PBAFan1975',
        votes: 34,
        featured: false,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'sub-2',
        type: 'question',
        title: 'PLACEHOLDER: Who had the best crossover in 1980s PBA?',
        description: 'PLACEHOLDER: A question about which player from the 1980s era had the most devastating crossover move.',
        author: 'HoopsHistory',
        votes: 28,
        featured: true,
        featuredEpisode: 'Episode 287',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'sub-3',
        type: 'stats-challenge',
        title: 'PLACEHOLDER: Name every PBA Finals MVP from 1975-1985',
        description: 'PLACEHOLDER: A stats challenge for the hosts to recall every PBA Finals MVP during the first decade of the league.',
        author: 'StatsMaster',
        votes: 21,
        featured: false,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'sub-4',
        type: 'what-if',
        title: 'PLACEHOLDER: What if the PBA had a 3-point line from the start?',
        description: 'PLACEHOLDER: Exploring how early PBA gameplay would have differed with the 3-point line introduced from the league\'s founding.',
        author: 'RetroHoops',
        votes: 45,
        featured: true,
        featuredEpisode: 'Episode 291',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
      },
      {
        id: 'sub-5',
        type: 'question',
        title: 'PLACEHOLDER: What was the most intense rivalry game ever played?',
        description: 'PLACEHOLDER: Asking the hosts to debate and pick the single most intense game in PBA rivalry history.',
        author: 'ClassicPBA',
        votes: 19,
        featured: false,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
      }
    ];
  }

  // ---------- Render Submissions ----------
  function renderSubmissions(container, items) {
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">&#128172;</div>
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
            <span class="type-badge ${sub.featured ? 'featured-badge' : ''}">${sub.featured ? '&#11088; Featured' : typeLabel}</span>
            <h4>${sub.title}</h4>
            <p>${sub.description}</p>
            <div class="episode-meta" style="margin-top:8px;">
              <span>by ${sub.author}</span>
              <span>${window.formatDate(sub.createdAt)}</span>
              ${sub.featured && sub.featuredEpisode ? `<span>&#127908; ${sub.featuredEpisode}</span>` : ''}
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
