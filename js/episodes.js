/* ============================================
   AEOB — Episodes Module
   Handles: fetching episodes from YouTube API
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
  let nextPageToken = null;

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

  // ---------- Fetch Episodes ----------
  async function fetchEpisodes(pageToken = null) {
    isLoading = true;
    try {
      const params = new URLSearchParams();
      if (pageToken) params.set('pageToken', pageToken);
      const data = await window.apiFetch(`episodes-list?${params.toString()}`);
      return data;
    } catch (err) {
      console.error('Failed to fetch episodes:', err);
      // Return demo data for initial build
      return { episodes: getDemoEpisodes(), nextPageToken: null };
    } finally {
      isLoading = false;
    }
  }

  // ---------- Demo Episodes (fallback) ----------
  function getDemoEpisodes() {
    const episodes = [];
    for (let i = 300; i > 0; i--) {
      const era = i > 200 ? '1990s' : i > 100 ? '1980s' : '1970s';
      const hosts = ['Charlie Cuna', 'Sid Ventura', 'Noel Zarate', 'Jay Mercado'];
      const shuffled = hosts.sort(() => Math.random() - 0.5).slice(0, 3);
      episodes.push({
        id: `ep-${i}`,
        videoId: '',
        title: `PLACEHOLDER: Episode ${i} Title — PBA History Discussion`,
        thumbnail: '',
        publishedAt: new Date(2024, 0, 1 + (300 - i) * 7).toISOString(),
        duration: 6600 + Math.floor(Math.random() * 1800),
        era: era,
        hosts: shuffled,
        teams: [],
        description: `PLACEHOLDER: Episode ${i} description. This episode covers classic PBA topics from the ${era} era.`
      });
    }
    return episodes.slice(0, 30);
  }

  // ---------- Render Episode Card ----------
  function renderEpisodeCard(ep) {
    const isFav = favorites.has(ep.id);
    const ytThumb = window.getYoutubeThumbnail ? window.getYoutubeThumbnail(ep.youtubeUrl || ep.videoId || '') : '';
    const thumbSrc = ytThumb || `https://placehold.co/640x360/1a1f5e/ffffff?text=Ep+${ep.id.replace('ep-', '')}`;
    const durationStr = window.formatDuration ? window.formatDuration(ep.duration) : '';
    const dateStr = window.formatDate ? window.formatDate(ep.publishedAt) : '';

    return `
      <div class="card episode-card" data-id="${ep.id}">
        <div class="thumb-wrap">
          <img src="${thumbSrc}" alt="${ep.title}" loading="lazy">
          ${durationStr ? `<span class="duration">${durationStr}</span>` : ''}
          <div class="play-overlay" onclick="Episodes.openPlayer('${ep.id}')">&#9654;</div>
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="Episodes.toggleFav('${ep.id}', event)" aria-label="Favorite">
            ${isFav ? '&#9829;' : '&#9825;'}
          </button>
        </div>
        <div class="card-body">
          <h3>${ep.title}</h3>
          <div class="episode-meta">
            <span>${dateStr}</span>
            ${ep.era ? `<span>${ep.era}</span>` : ''}
          </div>
          ${ep.hosts ? `
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
      // Award points
      awardPoints('favorite', 5);
    }

    saveFavorites();
    // Re-render to update heart icons
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

  // ---------- Episode Player Modal ----------
  function openPlayer(episodeId) {
    const ep = allEpisodes.find(e => e.id === episodeId);
    if (!ep || !modal) return;

    // YouTube embed — extract ID from URL or use videoId directly
    const ytId = window.extractYoutubeId ? window.extractYoutubeId(ep.youtubeUrl || ep.videoId || '') : (ep.videoId || '');
    if (ytId) {
      videoWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else {
      videoWrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#1a1f5e;color:#fff;font-size:1.2rem;padding:20px;text-align:center;">
        <p>Video player will load once a YouTube URL is added for this episode.<br><br>${ep.title}</p>
      </div>`;
    }

    modalInfo.innerHTML = `
      <h3>${ep.title}</h3>
      <div class="episode-meta" style="margin:8px 0;">
        <span>${window.formatDate(ep.publishedAt)}</span>
        <span>${window.formatDuration(ep.duration)}</span>
        ${ep.era ? `<span>${ep.era}</span>` : ''}
      </div>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-top:8px;">${ep.description || ''}</p>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Award points for watching
    awardPoints('watch', 10);
  }

  function closePlayer() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (videoWrap) videoWrap.innerHTML = '';
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

    // Check if we're on the episodes page (full) or home (preview)
    const isEpisodesPage = !!document.getElementById('episodesGrid');
    const isHomePage = !!document.getElementById('latestEpisodesGrid');

    const data = await fetchEpisodes();
    allEpisodes = data.episodes || [];
    nextPageToken = data.nextPageToken || null;
    filteredEpisodes = [...allEpisodes];

    if (isHomePage) {
      // Show only latest 3 on homepage
      renderGrid(allEpisodes.slice(0, 3));
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

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePlayer();
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---------- Public API ----------
  return {
    openPlayer,
    closePlayer,
    toggleFav,
    applyFilters,
    getEpisodes: () => allEpisodes,
    getFavorites: () => [...favorites]
  };
})();

window.Episodes = Episodes;
