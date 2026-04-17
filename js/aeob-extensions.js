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

  // Placeholder episode list. Replace the `src` values with real MP3 URLs later.
  const AUDIO_EPISODES = [
    {
      id: 'ep-300',
      title: 'Ep 300: The Landmark Special',
      host: 'Charlie, Sid, Noel & Jay',
      cover: 'https://res.cloudinary.com/djngpyv15/image/upload/v1776447309/274701765_319754193505498_1268754374260370953_n-removebg-preview_k6uyha.png',
      src: '' // user pastes real audio URL here
    },
    {
      id: 'ep-299',
      title: 'Ep 299: Atoy Co and the Crispa Dynasty',
      host: 'Charlie & Sid',
      cover: 'https://res.cloudinary.com/djngpyv15/image/upload/v1776447309/274701765_319754193505498_1268754374260370953_n-removebg-preview_k6uyha.png',
      src: ''
    },
    {
      id: 'ep-298',
      title: 'Ep 298: The Greatest Imports of the 90s',
      host: 'Noel & Jay',
      cover: 'https://res.cloudinary.com/djngpyv15/image/upload/v1776447309/274701765_319754193505498_1268754374260370953_n-removebg-preview_k6uyha.png',
      src: ''
    }
  ];

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
    let visible = state.visible !== false;

    function applyVisibility() {
      bar.classList.toggle('open', visible);
      launcher.classList.toggle('visible', !visible);
      document.body.classList.toggle('audio-bar-open', visible);
    }

    function loadEpisode(n, autoplay) {
      idx = (n + AUDIO_EPISODES.length) % AUDIO_EPISODES.length;
      const ep = AUDIO_EPISODES[idx];
      cover.src = ep.cover || '';
      titleEl.textContent = ep.title;
      subEl.textContent = ep.host;
      if (ep.src) {
        audio.src = ep.src;
        if (autoplay) {
          audio.play().catch(() => {});
        }
      } else {
        audio.removeAttribute('src');
      }
      savePlayerState({ id: ep.id, speed, visible });
    }

    playBtn.addEventListener('click', () => {
      if (!audio.src) {
        titleEl.textContent = AUDIO_EPISODES[idx].title + ' (audio coming soon)';
        return;
      }
      if (audio.paused) audio.play(); else audio.pause();
    });

    audio.addEventListener('play', () => {
      playBtn.innerHTML = '&#10073;&#10073;';
      playBtn.setAttribute('aria-label', 'Pause');
    });
    audio.addEventListener('pause', () => {
      playBtn.innerHTML = '&#9654;';
      playBtn.setAttribute('aria-label', 'Play');
    });

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
      if (audio.duration) audio.currentTime = Number(progress.value);
    });

    prevBtn.addEventListener('click', () => loadEpisode(idx - 1, !audio.paused));
    nextBtn.addEventListener('click', () => loadEpisode(idx + 1, !audio.paused));

    speedBtn.addEventListener('click', () => {
      const speeds = [1, 1.25, 1.5, 2, 0.75];
      const i = speeds.indexOf(speed);
      speed = speeds[(i + 1) % speeds.length];
      audio.playbackRate = speed;
      speedBtn.textContent = speed + 'x';
      savePlayerState({ id: AUDIO_EPISODES[idx].id, speed, visible });
    });

    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      muteBtn.innerHTML = audio.muted ? '&#128263;' : '&#128266;';
    });

    closeBtn.addEventListener('click', () => {
      visible = false;
      savePlayerState({ id: AUDIO_EPISODES[idx].id, speed, visible });
      applyVisibility();
      audio.pause();
    });

    launcher.addEventListener('click', () => {
      visible = true;
      savePlayerState({ id: AUDIO_EPISODES[idx].id, speed, visible });
      applyVisibility();
    });

    // Public API so episode cards can trigger playback
    window.AEOBAudio = {
      playEpisode(id) {
        const n = AUDIO_EPISODES.findIndex(e => e.id === id);
        if (n >= 0) {
          visible = true;
          applyVisibility();
          loadEpisode(n, true);
        }
      },
      list: AUDIO_EPISODES
    };

    audio.playbackRate = speed;
    speedBtn.textContent = speed + 'x';
    applyVisibility();
    loadEpisode(idx, false);
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
