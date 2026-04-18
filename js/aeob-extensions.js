/* ==========================================================================
   AEOB Extensions
   - Sticky global audio player (podcast strip)
   - Per-episode comments section (injected into #modalInfo via MutationObserver)
   ========================================================================== */

(function () {
  'use strict';

  /* -------------------------------------------------------------------------
     STICKY AUDIO PLAYER
     ------------------------------------------------------------------------- */

  // Episodes are fetched live from /.netlify/functions/episodes-list
  // Falls back to a minimal stub if the API is unreachable (e.g. local preview).
  const DEFAULT_COVER = 'https://res.cloudinary.com/djngpyv15/image/upload/v1776447309/274701765_319754193505498_1268754374260370953_n-removebg-preview_k6uyha.png';
  const FALLBACK_EPISODES = [{
    id: 'placeholder',
    title: 'Podcast episodes will appear here',
    host: 'Connect Airtable to load real episodes',
    cover: DEFAULT_COVER,
    src: ''
  }];

  let AUDIO_EPISODES = FALLBACK_EPISODES.slice();
  let episodesLoaded = false;

  async function fetchEpisodes() {
    try {
      const res = await fetch('/.netlify/functions/episodes-list?pageSize=50');
      if (!res.ok) throw new Error('Bad response');
      const data = await res.json();
      if (!data.episodes || !data.episodes.length) return null;

      // Prefer episodes with an audio URL; if any are marked Featured, show only those first.
      const withAudio = data.episodes.filter(ep => ep.audioUrl);
      const featured  = withAudio.filter(ep => ep.featured);
      const pool      = featured.length ? featured : (withAudio.length ? withAudio : data.episodes);

      // If nothing has audio but things have YouTube URLs, use YouTube fallback
      const poolHasAudio = pool.some(ep => ep.audioUrl);
      const finalPool = poolHasAudio ? pool : data.episodes.filter(ep => ep.youtubeUrl);

      return finalPool.map(ep => ({
        id: ep.id || ('ep-' + ep.episodeNumber),
        title: ep.episodeNumber ? ('Ep ' + ep.episodeNumber + ': ' + ep.title) : ep.title,
        host: Array.isArray(ep.hosts) && ep.hosts.length ? ep.hosts.join(', ') : 'AEOB',
        cover: DEFAULT_COVER,
        src: ep.audioUrl || '',
        youtubeUrl: ep.youtubeUrl || '',
        youtubeId: extractYouTubeId(ep.youtubeUrl)
      }));
    } catch (err) {
      console.warn('[AEOBAudio] Could not fetch episodes, using fallback.', err);
      return null;
    }
  }

  // Extract YouTube video ID from any common URL format
  function extractYouTubeId(url) {
    if (!url) return '';
    const m = String(url).match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }

  const PLAYER_STATE_KEY = 'aeob-audio-state';

  function loadPlayerState() {
    try { return JSON.parse(localStorage.getItem(PLAYER_STATE_KEY)) || {}; }
    catch { return {}; }
  }
  function savePlayerState(s) {
    try { localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(s)); } catch {}
  }

  function buildPlayerDOM() {
    if (document.getElementById('aeobAudioBar')) return;

    const bar = document.createElement('div');
    bar.className = 'audio-bar';
    bar.id = 'aeobAudioBar';
    bar.innerHTML = `
      <div class="audio-bar-inner">
        <div class="audio-cover">
          <img id="audioCover" src="" alt="Cover">
        </div>
        <div class="audio-meta">
          <div class="audio-title" id="audioTitle">Select an episode</div>
          <div class="audio-sub" id="audioSub">AEOB Podcast</div>
        </div>
        <div class="audio-controls">
          <button class="audio-btn" id="audioPrev" aria-label="Previous">&#9198;</button>
          <button class="audio-btn audio-play" id="audioPlay" aria-label="Play">&#9654;</button>
          <button class="audio-btn" id="audioNext" aria-label="Next">&#9197;</button>
        </div>
        <div class="audio-progress-wrap">
          <span class="audio-time" id="audioCurrent">0:00</span>
          <input type="range" min="0" max="100" value="0" class="audio-progress" id="audioProgress" aria-label="Seek">
          <span class="audio-time" id="audioDuration">0:00</span>
        </div>
        <div class="audio-extras">
          <button class="audio-btn" id="audioSpeed" aria-label="Playback speed">1x</button>
          <button class="audio-btn" id="audioMute" aria-label="Mute">&#128266;</button>
          <button class="audio-btn audio-close" id="audioClose" aria-label="Close player">&times;</button>
        </div>
      </div>
      <audio id="audioEl" preload="metadata"></audio>
      <div id="audioYT" style="position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;"></div>
    `;
    document.body.appendChild(bar);

    // Floating launcher (shows when bar is hidden)
    const launcher = document.createElement('button');
    launcher.className = 'audio-launcher';
    launcher.id = 'aeobAudioLauncher';
    launcher.setAttribute('aria-label', 'Open podcast player');
    launcher.innerHTML = '<span>&#127911;</span>';
    document.body.appendChild(launcher);
  }

  function fmtTime(sec) {
    if (!isFinite(sec)) return '0:00';
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  // Load the YouTube IFrame API once, return a ready promise.
  let ytApiPromise = null;
  function loadYouTubeApi() {
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    });
    return ytApiPromise;
  }

  function initPlayer() {
    buildPlayerDOM();

    const bar = document.getElementById('aeobAudioBar');
    const launcher = document.getElementById('aeobAudioLauncher');
    const audio = document.getElementById('audioEl');
    const cover = document.getElementById('audioCover');
    const titleEl = document.getElementById('audioTitle');
    const subEl = document.getElementById('audioSub');
    const playBtn = document.getElementById('audioPlay');
    const prevBtn = document.getElementById('audioPrev');
    const nextBtn = document.getElementById('audioNext');
    const progress = document.getElementById('audioProgress');
    const currentEl = document.getElementById('audioCurrent');
    const durationEl = document.getElementById('audioDuration');
    const speedBtn = document.getElementById('audioSpeed');
    const muteBtn = document.getElementById('audioMute');
    const closeBtn = document.getElementById('audioClose');

    const state = loadPlayerState();
    let idx = Math.max(0, AUDIO_EPISODES.findIndex(e => e.id === state.id));
    if (idx < 0) idx = 0;
    let speed = state.speed || 1;
    // Bar is hidden until the user explicitly plays something. Once they have a
    // saved episode from a prior session, reopen the bar for them.
    let hasPicked = !!state.id && state.id !== 'placeholder';
    let visible = hasPicked && state.visible !== false;

    // Playback mode: 'audio' | 'yt' | 'none'
    let mode = 'none';
    let ytPlayer = null;
    let ytReady = false;
    let ytPoll = null;

    function applyVisibility() {
      bar.classList.toggle('open', visible);
      launcher.classList.toggle('visible', !visible);
      document.body.classList.toggle('audio-bar-open', visible);
    }

    function setPlayIcon(playing) {
      playBtn.innerHTML = playing ? '&#10073;&#10073;' : '&#9654;';
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }

    function stopAll() {
      try { audio.pause(); } catch (e) {}
      try { audio.removeAttribute('src'); audio.load(); } catch (e) {}
      if (ytPlayer && ytReady) {
        try { ytPlayer.stopVideo(); } catch (e) {}
      }
      clearInterval(ytPoll);
      ytPoll = null;
    }

    function startYtPoll() {
      clearInterval(ytPoll);
      ytPoll = setInterval(() => {
        if (!ytPlayer || !ytReady) return;
        try {
          const cur = ytPlayer.getCurrentTime() || 0;
          const dur = ytPlayer.getDuration() || 0;
          currentEl.textContent = fmtTime(cur);
          if (dur && progress.max !== String(Math.floor(dur))) {
            progress.max = Math.floor(dur);
            durationEl.textContent = fmtTime(dur);
          }
          progress.value = Math.floor(cur);
        } catch (e) {}
      }, 500);
    }

    function loadYoutube(ep, autoplay) {
      mode = 'yt';
      loadYouTubeApi().then(YT => {
        if (!ytPlayer) {
          ytPlayer = new YT.Player('audioYT', {
            height: '1', width: '1',
            videoId: ep.youtubeId,
            playerVars: { autoplay: autoplay ? 1 : 0, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1 },
            events: {
              onReady: (e) => {
                ytReady = true;
                try { e.target.setPlaybackRate(speed); } catch (err) {}
                if (autoplay) {
                  try { e.target.playVideo(); } catch (err) {}
                }
                startYtPoll();
              },
              onStateChange: (e) => {
                if (e.data === YT.PlayerState.PLAYING) { setPlayIcon(true); startYtPoll(); }
                else if (e.data === YT.PlayerState.PAUSED) { setPlayIcon(false); }
                else if (e.data === YT.PlayerState.ENDED) { loadEpisode(idx + 1, true); }
              }
            }
          });
        } else if (ytReady) {
          ytPlayer.loadVideoById(ep.youtubeId);
          try { ytPlayer.setPlaybackRate(speed); } catch (err) {}
          if (!autoplay) { try { ytPlayer.pauseVideo(); } catch (err) {} }
          startYtPoll();
        }
      });
    }

    function loadEpisode(n, autoplay) {
      idx = (n + AUDIO_EPISODES.length) % AUDIO_EPISODES.length;
      const ep = AUDIO_EPISODES[idx];
      cover.src = ep.cover || '';
      titleEl.textContent = ep.title;
      subEl.textContent = ep.host;

      stopAll();
      setPlayIcon(false);
      currentEl.textContent = '0:00';
      durationEl.textContent = '0:00';
      progress.value = 0;

      if (ep.src) {
        mode = 'audio';
        audio.src = ep.src;
        audio.playbackRate = speed;
        if (autoplay) audio.play().catch(() => {});
      } else if (ep.youtubeId) {
        loadYoutube(ep, autoplay);
      } else {
        mode = 'none';
      }
      savePlayerState({ id: ep.id, speed, visible });
    }

    playBtn.addEventListener('click', () => {
      const ep = AUDIO_EPISODES[idx];
      if (mode === 'audio') {
        if (audio.paused) audio.play(); else audio.pause();
      } else if (mode === 'yt' && ytPlayer && ytReady) {
        const st = ytPlayer.getPlayerState();
        if (st === 1) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
      } else if (ep && ep.youtubeId) {
        loadYoutube(ep, true);
      } else if (ep && ep.src) {
        audio.src = ep.src; audio.play().catch(() => {});
      } else {
        titleEl.textContent = ep.title + ' (audio coming soon)';
      }
    });

    audio.addEventListener('play', () => setPlayIcon(true));
    audio.addEventListener('pause', () => setPlayIcon(false));
    audio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = fmtTime(audio.duration);
      progress.max = Math.floor(audio.duration) || 100;
    });
    audio.addEventListener('timeupdate', () => {
      currentEl.textContent = fmtTime(audio.currentTime);
      progress.value = Math.floor(audio.currentTime);
    });
    audio.addEventListener('ended', () => loadEpisode(idx + 1, true));

    progress.addEventListener('input', () => {
      const v = Number(progress.value);
      if (mode === 'audio' && audio.duration) audio.currentTime = v;
      else if (mode === 'yt' && ytPlayer && ytReady) {
        try { ytPlayer.seekTo(v, true); } catch (e) {}
      }
    });

    prevBtn.addEventListener('click', () => loadEpisode(idx - 1, true));
    nextBtn.addEventListener('click', () => loadEpisode(idx + 1, true));

    speedBtn.addEventListener('click', () => {
      const speeds = [1, 1.25, 1.5, 2, 0.75];
      const i = speeds.indexOf(speed);
      speed = speeds[(i + 1) % speeds.length];
      if (mode === 'audio') audio.playbackRate = speed;
      else if (mode === 'yt' && ytPlayer && ytReady) { try { ytPlayer.setPlaybackRate(speed); } catch (e) {} }
      speedBtn.textContent = speed + 'x';
      savePlayerState({ id: AUDIO_EPISODES[idx].id, speed, visible });
    });

    muteBtn.addEventListener('click', () => {
      if (mode === 'audio') {
        audio.muted = !audio.muted;
        muteBtn.innerHTML = audio.muted ? '&#128263;' : '&#128266;';
      } else if (mode === 'yt' && ytPlayer && ytReady) {
        if (ytPlayer.isMuted()) { ytPlayer.unMute(); muteBtn.innerHTML = '&#128266;'; }
        else { ytPlayer.mute(); muteBtn.innerHTML = '&#128263;'; }
      }
    });

    closeBtn.addEventListener('click', () => {
      visible = false;
      savePlayerState({ id: AUDIO_EPISODES[idx].id, speed, visible });
      applyVisibility();
      stopAll();
      setPlayIcon(false);
    });

    launcher.addEventListener('click', () => {
      visible = true;
      savePlayerState({ id: AUDIO_EPISODES[idx].id, speed, visible });
      applyVisibility();
    });

    // Normalize an episode from the Episodes API shape to the player shape.
    function toPlayerShape(raw) {
      if (!raw || typeof raw !== 'object') return null;
      return {
        id: raw.id || ('ep-' + (raw.episodeNumber || Date.now())),
        title: raw.episodeNumber ? ('Ep ' + raw.episodeNumber + ': ' + raw.title) : (raw.title || 'Untitled'),
        host: Array.isArray(raw.hosts) && raw.hosts.length
          ? raw.hosts.join(', ')
          : (raw.host || 'AEOB'),
        cover: raw.cover || DEFAULT_COVER,
        src: raw.src || raw.audioUrl || '',
        youtubeUrl: raw.youtubeUrl || '',
        youtubeId: raw.youtubeId || extractYouTubeId(raw.youtubeUrl || '')
      };
    }

    // Public API so episode cards can trigger playback
    window.AEOBAudio = {
      playEpisode(input) {
        let n = -1;
        if (typeof input === 'string') {
          n = AUDIO_EPISODES.findIndex(e => e.id === input);
        } else if (input && typeof input === 'object') {
          const ep = toPlayerShape(input);
          if (!ep) return;
          n = AUDIO_EPISODES.findIndex(e => e.id === ep.id);
          if (n < 0) {
            AUDIO_EPISODES = [ep].concat(AUDIO_EPISODES.filter(e => e.id !== 'placeholder'));
            n = 0;
          } else {
            AUDIO_EPISODES[n] = ep;
          }
          // AUDIO_EPISODES updated in place; window.AEOBAudio.list is a getter over it.
        }
        if (n >= 0) {
          hasPicked = true;
          visible = true;
          applyVisibility();
          loadEpisode(n, true);
        }
      },
      refresh(newList) {
        if (!newList || !newList.length) return;
        const prevId = AUDIO_EPISODES[idx] && AUDIO_EPISODES[idx].id;
        // Normalize every entry so refresh() from episodes.js works too.
        AUDIO_EPISODES = newList.map(e => toPlayerShape(e)).filter(Boolean);
        // window.AEOBAudio.list is a getter over AUDIO_EPISODES, no reassignment needed.
        const n = prevId ? AUDIO_EPISODES.findIndex(e => e.id === prevId) : -1;
        idx = n >= 0 ? n : 0;
        // Only re-load episode UI if we already had something showing; otherwise
        // leave the bar dormant until the user picks something.
        if (hasPicked) loadEpisode(idx, false);
      },
      get list() { return AUDIO_EPISODES; }
    };

    audio.playbackRate = speed;
    speedBtn.textContent = speed + 'x';
    applyVisibility();
    // Only preload the saved episode if the user actually had one before.
    if (hasPicked) loadEpisode(idx, false);
  }

  /* -------------------------------------------------------------------------
     PER-EPISODE COMMENTS
     Injects a comments section into the #modalInfo content on episodes.html
     whenever an episode modal opens, without modifying episodes.js.
     ------------------------------------------------------------------------- */

  const COMMENTS_KEY = 'aeob-ep-comments';

  function loadComments() {
    try { return JSON.parse(localStorage.getItem(COMMENTS_KEY)) || {}; }
    catch { return {}; }
  }
  function saveComments(c) {
    try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(c)); } catch {}
  }

  function currentUserName() {
    try {
      const u = JSON.parse(localStorage.getItem('aeob-user') || 'null');
      if (u && (u.name || u.email)) return u.name || u.email.split('@')[0];
    } catch {}
    return 'Guest Fan';
  }

  function getEpisodeKey(modalContent) {
    // Try to grab a stable identifier from the visible modal
    const titleEl = modalContent.querySelector('h2, h1, .modal-title');
    const title = titleEl ? titleEl.textContent.trim() : '';
    return title ? 'ep:' + title.toLowerCase().replace(/\s+/g, '-').slice(0, 80) : '';
  }

  function renderCommentsList(epKey, listEl) {
    const all = loadComments();
    const arr = all[epKey] || [];
    if (!arr.length) {
      listEl.innerHTML = '<p class="muted-sm ep-comments-empty">No comments yet. Be the first to share your take.</p>';
      return;
    }
    listEl.innerHTML = arr
      .slice()
      .reverse()
      .map(c => `
        <div class="ep-comment">
          <div class="ep-comment-avatar">${(c.name || '?').charAt(0).toUpperCase()}</div>
          <div class="ep-comment-body">
            <div class="ep-comment-head">
              <strong>${escapeHTML(c.name || 'Guest')}</strong>
              <span class="muted-sm">${timeAgo(c.at)}</span>
            </div>
            <div class="ep-comment-text">${escapeHTML(c.text)}</div>
            <div class="ep-comment-actions">
              <button class="ep-like" data-id="${c.id}">
                &#128077; <span>${c.likes || 0}</span>
              </button>
            </div>
          </div>
        </div>
      `).join('');
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function timeAgo(ts) {
    const d = (Date.now() - ts) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return Math.floor(d / 86400) + 'd ago';
  }

  function injectComments(modalContent) {
    if (!modalContent) return;
    if (modalContent.querySelector('.ep-comments-section')) return; // already there

    const epKey = getEpisodeKey(modalContent);
    if (!epKey) return;

    const section = document.createElement('div');
    section.className = 'ep-comments-section';
    section.innerHTML = `
      <h3 class="ep-comments-heading">Fan Takes</h3>
      <div class="ep-comment-form">
        <textarea class="form-input" rows="2" placeholder="Share your take on this episode..." maxlength="500"></textarea>
        <div class="ep-comment-form-row">
          <span class="muted-sm">Posting as <strong>${escapeHTML(currentUserName())}</strong></span>
          <button class="btn btn-primary btn-sm ep-post-btn">Post</button>
        </div>
      </div>
      <div class="ep-comments-list"></div>
    `;
    modalContent.appendChild(section);

    const listEl = section.querySelector('.ep-comments-list');
    const ta = section.querySelector('textarea');
    const btn = section.querySelector('.ep-post-btn');

    renderCommentsList(epKey, listEl);

    btn.addEventListener('click', () => {
      const text = ta.value.trim();
      if (!text) return;
      const all = loadComments();
      all[epKey] = all[epKey] || [];
      all[epKey].push({
        id: 'c_' + Date.now().toString(36),
        name: currentUserName(),
        text,
        at: Date.now(),
        likes: 0
      });
      saveComments(all);
      ta.value = '';
      renderCommentsList(epKey, listEl);
    });

    listEl.addEventListener('click', (e) => {
      const like = e.target.closest('.ep-like');
      if (!like) return;
      const id = like.dataset.id;
      const all = loadComments();
      const arr = all[epKey] || [];
      const c = arr.find(x => x.id === id);
      if (c) {
        c.likes = (c.likes || 0) + 1;
        saveComments(all);
        renderCommentsList(epKey, listEl);
      }
    });
  }

  function initCommentsObserver() {
    const modal = document.getElementById('modalInfo') || document.querySelector('.modal');
    if (!modal) return; // not an episodes page

    const observer = new MutationObserver(() => {
      const isOpen = modal.classList.contains('active') ||
                     modal.classList.contains('show') ||
                     modal.classList.contains('open') ||
                     modal.style.display === 'flex' ||
                     modal.style.display === 'block';
      if (isOpen) {
        // Find the inner content container
        const inner = modal.querySelector('.modal-body') ||
                      modal.querySelector('.modal-content') ||
                      modal.querySelector('.modal-inner') ||
                      modal;
        setTimeout(() => injectComments(inner), 50);
      }
    });

    observer.observe(modal, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });
  }

  /* -------------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------------- */
  function boot() {
    initPlayer();
    initCommentsObserver();

    // Kick off live episode fetch and refresh the player when it arrives
    fetchEpisodes().then(list => {
      if (list && window.AEOBAudio && typeof window.AEOBAudio.refresh === 'function') {
        episodesLoaded = true;
        window.AEOBAudio.refresh(list);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
