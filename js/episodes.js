/* ============================================
   AEOB — Episodes Module
   Handles: fetching episodes from Airtable
   via serverless function, search/filter,
   favorites, episode player modal, and
   personalized recommendations
   ============================================ */

const Episodes = (() => {
  // State
  let allEpisodes = [];
  let filteredEpisodes = [];
  let favorites = new Set();
  let currentPage = 1;
  const PAGE_SIZE = 12;
  let isLoading = false;

  // DOM
  const grid = document.getElementById('episodesGrid') || document.getElementById('latestEpisodesGrid');
  const searchInput = document.getElementById('episodeSearch');
  const eraFilter = document.getElementById('eraFilter');
  const teamFilter = document.getElementById('teamFilter');
  const hostFilter = document.getElementById('hostFilter');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const favGrid = document.getElementById('favoritesGrid');
  const modal = document.getElementById('episodeModal');
  const videoWrap = document.getElementById('videoWrap');
  const modalInfo = document.getElementById('modalInfo');
  const closeModal = document.getElementById('closeEpisodeModal');

  // ---------- Fetch Episodes from Airtable ----------
  async function fetchEpisodes() {
    isLoading = true;
    try {
      const data = await window.apiFetch('episodes-list?pageSize=500');
      return data;
    } catch (err) {
      console.error('Failed to fetch episodes:', err);
      return { episodes: [], totalResults: 0 };
    } finally {
      isLoading = false;
    }
  }

  // ---------- Render Episode Card ----------
  function renderEpisodeCard(ep) {
    const isFav = favorites.has(ep.id);
    const ytThumb = window.getYoutubeThumbnail ? window.getYoutubeThumbnail(ep.youtubeUrl || '') : '';
    const epNum = ep.episodeNumber || ep.title.match(/\d+/)?.[0] || '';
    const thumbSrc = ytThumb || `https://placehold.co/640x360/1a1f5e/ffffff?text=Ep+${epNum}`;
    const durationStr = window.formatDuration ? window.formatDuration(ep.duration) : '';
    const dateStr = ep.publishedAt && window.formatDate ? window.formatDate(ep.publishedAt) : '';

    return `
      <div class="card episode-card" data-id="${ep.id}">
        <div class="thumb-wrap">
          <img src="${thumbSrc}" alt="${ep.title}" loading="lazy" onclick="Episodes.playInBar('${ep.id}')" style="cursor:pointer;">
          ${durationStr ? `<span class="duration">${durationStr}</span>` : ''}
          <div class="play-overlay" onclick="Episodes.playInBar('${ep.id}')" aria-label="Play episode" title="Play">&#9654;</div>
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="Episodes.toggleFav('${ep.id}', event)" aria-label="Favorite">
            ${isFav ? '&#9829;' : '&#9825;'}
          </button>
        </div>
        <div class="card-body" onclick="Episodes.openPlayer('${ep.id}')" style="cursor:pointer;">
          <h3>${ep.title}</h3>
          <div class="episode-meta">
            ${dateStr ? `<span>${dateStr}</span>` : ''}
            ${ep.era ? `<span>${ep.era}</span>` : ''}
          </div>
          ${ep.hosts && ep.hosts.length ? `
          <div class="episode-tags">
            ${ep.hosts.map(h => `<span class="episode-tag">${h}</span>`).join('')}
          </div>` : ''}
        </div>
      </div>
    `;
  }

  // ---------- Render Grid ----------
  function renderGrid(episodes, targetGrid) {
    const container = targetGrid || grid;
    if (!container) return;

    if (episodes.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">&#127936;</div>
          <h3>No episodes found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = episodes.map(renderEpisodeCard).join('');
  }

  // ---------- Filter & Search ----------
  function applyFilters() {
    const query = searchInput?.value?.toLowerCase().trim() || '';
    const era = eraFilter?.value || '';
    const team = teamFilter?.value || '';
    const host = hostFilter?.value || '';

    filteredEpisodes = allEpisodes.filter(ep => {
      if (query && !ep.title.toLowerCase().includes(query) && !ep.description?.toLowerCase().includes(query)) return false;
      if (era && ep.era !== era) return false;
      if (team && (!ep.teams || !ep.teams.includes(team))) return false;
      if (host && (!ep.hosts || !ep.hosts.includes(host))) return false;
      return true;
    });

    // Personalization: if user has favorite era, sort those first
    const user = window.Auth?.getUser();
    if (user?.favEra && !era && !query) {
      filteredEpisodes.sort((a, b) => {
        const aMatch = a.era === user.favEra ? 0 : 1;
        const bMatch = b.era === user.favEra ? 0 : 1;
        return aMatch - bMatch;
      });
    }

    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const pageEpisodes = filteredEpisodes.slice(0, currentPage * PAGE_SIZE);
    renderGrid(pageEpisodes);

    if (loadMoreBtn) {
      loadMoreBtn.style.display = pageEpisodes.length < filteredEpisodes.length ? 'inline-flex' : 'none';
    }
  }

  // ---------- Favorites ----------
  function loadFavorites() {
    const stored = localStorage.getItem('aeob-favorites');
    if (stored) {
      try {
        favorites = new Set(JSON.parse(stored));
      } catch (e) {
        favorites = new Set();
      }
    }
  }

  function saveFavorites() {
    localStorage.setItem('aeob-favorites', JSON.stringify([...favorites]));
  }

  function toggleFav(episodeId, event) {
    if (event) event.stopPropagation();

    if (!window.Auth?.isLoggedIn()) {
      window.Auth?.openModal();
      window.showToast('Sign in to save favorites', 'info');
      return;
    }

    if (favorites.has(episodeId)) {
      favorites.delete(episodeId);
      window.showToast('Removed from favorites', 'info');
    } else {
      favorites.add(episodeId);
      window.showToast('Added to favorites!', 'success');
      awardPoints('favorite', 5);
    }

    saveFavorites();
    if (filteredEpisodes.length > 0) renderPage();
    renderFavorites();
  }

  function renderFavorites() {
    if (!favGrid) return;
    const favEpisodes = allEpisodes.filter(ep => favorites.has(ep.id));
    if (favEpisodes.length === 0) {
      favGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">&#9825;</div>
          <h3>No favorites yet</h3>
          <p>Click the heart icon on any episode to save it here.</p>
        </div>
      `;
    } else {
      renderGrid(favEpisodes, favGrid);
    }
  }

  // ---------- Play in Sticky Bar ----------
  function playInBar(episodeId) {
    const ep = allEpisodes.find(e => e.id === episodeId);
    if (!ep) return;
    if (window.AEOBAudio && typeof window.AEOBAudio.playEpisode === 'function') {
      window.AEOBAudio.playEpisode(ep);
      if (window.showToast) window.showToast('Playing: ' + ep.title, 'success');
      awardPoints('watch', 5);
    } else {
      // Fallback: if the sticky bar hasn't initialized yet, open the info modal.
      openPlayer(episodeId);
    }
  }

  // ---------- Episode Player Modal (info / reviews) ----------
  function openPlayer(episodeId) {
    const ep = allEpisodes.find(e => e.id === episodeId);
    if (!ep || !modal) return;

    // Show a thumbnail + "Play episode" button instead of auto-embedding video.
    // Playback now happens in the sticky bar.
    const ytThumb = window.getYoutubeThumbnail ? window.getYoutubeThumbnail(ep.youtubeUrl || '') : '';
    const epNum = ep.episodeNumber || '';
    const thumbSrc = ytThumb || `https://placehold.co/960x540/1a1f5e/ffffff?text=Ep+${epNum}`;
    videoWrap.innerHTML = `
      <div class="modal-play-hero" style="position:relative;width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick="Episodes.playInBar('${ep.id}')">
        <img src="${thumbSrc}" alt="${ep.title}" style="width:100%;height:100%;object-fit:cover;opacity:0.7;">
        <button class="btn btn-primary" style="position:absolute;display:inline-flex;align-items:center;gap:8px;font-size:1.05rem;padding:12px 22px;" onclick="event.stopPropagation();Episodes.playInBar('${ep.id}')">
          <span style="font-size:1.2rem;">&#9654;</span> Play episode
        </button>
      </div>`;

    const isLoggedIn = window.Auth?.isLoggedIn();
    const ratingSection = isLoggedIn ? `
      <div class="review-form" style="margin-top:12px;">
        <label style="font-weight:600;font-size:0.9rem;">Rate this episode:</label>
        <div class="star-rating" id="modalStarRating" data-ep="${ep.id}" data-epnum="${ep.episodeNumber || 0}">
          ${[1,2,3,4,5,6,7,8,9,10].map(n => `<span class="star" data-val="${n}">&#9733;</span>`).join('')}
        </div>
        <textarea id="modalReviewText" placeholder="Write a short review (optional)..." maxlength="500"></textarea>
        <button class="btn btn-sm btn-primary" id="submitReviewBtn">Submit Rating</button>
      </div>
    ` : `<p style="font-size:0.85rem;color:var(--text-secondary);margin-top:12px;">Sign in to rate and review this episode.</p>`;

    modalInfo.innerHTML = `
      <h3>${ep.title}</h3>
      <div class="episode-meta" style="margin:8px 0;">
        ${ep.publishedAt ? `<span>${window.formatDate(ep.publishedAt)}</span>` : ''}
        ${ep.duration ? `<span>${window.formatDuration(ep.duration)}</span>` : ''}
        ${ep.era ? `<span>${ep.era}</span>` : ''}
      </div>
      <div class="avg-rating" id="modalAvgRating"></div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-top:8px;">${ep.description || ''}</p>
      ${ratingSection}
      <div class="review-list" id="modalReviewList"></div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    awardPoints('watch', 10);

    // Load reviews for this episode
    loadEpisodeReviews(ep.id);

    // Bind star rating clicks
    let selectedRating = 0;
    document.querySelectorAll('#modalStarRating .star').forEach(star => {
      star.addEventListener('click', () => {
        selectedRating = parseInt(star.dataset.val);
        document.querySelectorAll('#modalStarRating .star').forEach((s, i) => {
          s.classList.toggle('filled', i < selectedRating);
        });
      });
    });

    // Bind submit review
    const submitBtn = document.getElementById('submitReviewBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (!selectedRating) { window.showToast('Select a rating first', 'error'); return; }
        const reviewText = document.getElementById('modalReviewText')?.value || '';
        try {
          await window.apiFetch('reviews', {
            method: 'POST',
            body: JSON.stringify({ episodeId: ep.id, episodeNumber: ep.episodeNumber || 0, rating: selectedRating, review: reviewText })
          });
          window.showToast(`Rated ${selectedRating}/10! ${reviewText ? '+review' : ''}`, 'success');
          awardPoints('watch', 5);
          loadEpisodeReviews(ep.id);
        } catch (e) {
          window.showToast('Failed to submit rating', 'error');
        }
      });
    }
  }

  function closePlayer() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (videoWrap) videoWrap.innerHTML = '';
  }

  // ---------- Load Episode Reviews ----------
  async function loadEpisodeReviews(episodeId) {
    try {
      const data = await window.apiFetch(`reviews?episodeId=${episodeId}`);
      const avgEl = document.getElementById('modalAvgRating');
      const listEl = document.getElementById('modalReviewList');

      if (avgEl && data.totalRatings > 0) {
        avgEl.innerHTML = `
          <span class="avg-num">${data.avgRating}/10</span>
          <span class="avg-count">${data.totalRatings} rating${data.totalRatings > 1 ? 's' : ''}</span>
        `;
      }

      if (listEl && data.reviews.length > 0) {
        listEl.innerHTML = data.reviews
          .filter(r => r.review)
          .slice(0, 5)
          .map(r => `
            <div class="review-item">
              <div class="review-header">
                <span class="review-user">${r.userName || 'Fan'}</span>
                <span class="review-stars">${'&#9733;'.repeat(Math.min(r.rating, 10))} ${r.rating}/10</span>
              </div>
              ${r.review ? `<p class="review-text">${r.review}</p>` : ''}
            </div>
          `).join('');
      }
    } catch (e) {
      // Reviews are optional
    }
  }

  // ---------- Load Recommendations ----------
  async function loadRecommendations() {
    const recGrid = document.getElementById('recommendedGrid');
    if (!recGrid) return;

    try {
      const data = await window.apiFetch('recommendations');
      if (!data.recommendations || data.recommendations.length === 0) return;

      // Show the section
      const section = document.getElementById('recommended-section');
      if (section) section.style.display = '';

      recGrid.innerHTML = data.recommendations.slice(0, 6).map(ep => {
        const ytThumb = window.getYoutubeThumbnail ? window.getYoutubeThumbnail(ep.youtubeUrl || '') : '';
        const epNum = ep.episodeNumber || '';
        const thumbSrc = ytThumb || `https://placehold.co/640x360/1a1f5e/ffffff?text=Ep+${epNum}`;
        return `
          <div class="card episode-card" data-id="${ep.id}">
            <div class="thumb-wrap">
              <img src="${thumbSrc}" alt="${ep.title}" loading="lazy" onclick="Episodes.playInBar('${ep.id}')" style="cursor:pointer;">
              <div class="play-overlay" onclick="Episodes.playInBar('${ep.id}')" aria-label="Play episode" title="Play">&#9654;</div>
            </div>
            <div class="card-body" onclick="Episodes.openPlayer('${ep.id}')" style="cursor:pointer;">
              <h3>${ep.title}</h3>
              ${ep.reason ? `<div class="rec-reason">${ep.reason}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      // Recommendations are optional
    }
  }

  // ---------- Points Integration ----------
  function awardPoints(action, points) {
    if (!window.Auth?.isLoggedIn()) return;
    try {
      window.apiFetch('rewards-log', {
        method: 'POST',
        body: JSON.stringify({ action, points })
      });
    } catch (e) {
      // Silently fail — points are a bonus feature
    }
  }

  // ---------- Init ----------
  async function init() {
    loadFavorites();

    const isEpisodesPage = !!document.getElementById('episodesGrid');
    const isHomePage = !!document.getElementById('latestEpisodesGrid');

    const data = await fetchEpisodes();
    allEpisodes = data.episodes || [];
    filteredEpisodes = [...allEpisodes];

    // Give the sticky audio bar the full archive so prev/next can cycle everything
    // and so playInBar can play any episode (not just the 10 it fetches itself).
    if (allEpisodes.length && window.AEOBAudio && typeof window.AEOBAudio.refresh === 'function') {
      const playerList = allEpisodes.map(ep => ({
        id: ep.id || ('ep-' + ep.episodeNumber),
        title: ep.episodeNumber ? ('Ep ' + ep.episodeNumber + ': ' + ep.title) : ep.title,
        host: Array.isArray(ep.hosts) && ep.hosts.length ? ep.hosts.join(', ') : 'AEOB',
        src: ep.audioUrl || '',
        youtubeUrl: ep.youtubeUrl || ''
      }));
      window.AEOBAudio.refresh(playerList);
    }

    if (isHomePage) {
      renderGrid(allEpisodes.slice(0, 3));
      loadRecommendations();
    } else if (isEpisodesPage) {
      renderPage();
      renderFavorites();
    }

    // Bind search and filters
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
      });
    }

    if (eraFilter) eraFilter.addEventListener('change', applyFilters);
    if (teamFilter) teamFilter.addEventListener('change', applyFilters);
    if (hostFilter) hostFilter.addEventListener('change', applyFilters);

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        renderPage();
      });
    }

    // Close modal
    if (closeModal) closeModal.addEventListener('click', closePlayer);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closePlayer();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePlayer();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    openPlayer,
    closePlayer,
    playInBar,
    toggleFav,
    applyFilters,
    getEpisodes: () => allEpisodes,
    getFavorites: () => [...favorites]
  };
})();

window.Episodes = Episodes;
