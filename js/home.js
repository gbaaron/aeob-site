/* ============================================
   AEOB — Home page
   Everything here is built from the live episode
   feed: the hero art wall, the scorebug numbers,
   the sideways cover wall and the archive
   spotlight. Add an episode to the feed and it
   shows up in all four with no second edit.
   ============================================ */

(function () {
  'use strict';

  // Show notes end in the same boilerplate every week; keep the part about the guest.
  function blurb(ep) {
    const text = String(ep.description || '').replace(/<[^>]+>/g, ' ')
      .split(/Hosted by|Watch this episode|Follow the show|Support the show/i)[0]
      .replace(/\s+/g, ' ').trim();
    if (text.length <= 240) return text;
    const cut = text.slice(0, 240);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }

  function renderWall(eps) {
    const el = document.getElementById('artwall');
    if (!el) return;
    el.innerHTML = eps.slice(0, 32).map(ep =>
      `<img src="${window.escAttr(window.epArt(ep, 260))}" data-raw="${window.escAttr(ep.image || '')}" alt="" decoding="async" onload="this.classList.add('is-in')" onerror="coverFallback(this)">`
    ).join('');
  }

  function renderStats(eps) {
    const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
    set('statEpisodes', eps.length);
    const hours = Math.round(eps.reduce((sum, ep) => sum + (Number(ep.duration) || 0), 0) / 3600);
    if (hours) set('statHours', hours.toLocaleString());
    set('wallCount', eps.length);
  }

  function renderRoll(eps) {
    const track = document.getElementById('wallTrack');
    if (!track) return;
    const tiles = (hidden) => eps.slice(6, 24).map(ep =>
      `<button type="button" data-ep="${window.escAttr(ep.id)}" ${hidden ? 'aria-hidden="true" tabindex="-1"' : `aria-label="${window.escAttr(ep.title)}"`}>${window.coverImg(ep, 320, 'cover')}</button>`
    ).join('');
    // Second copy makes the loop seamless.
    track.innerHTML = tiles(false) + tiles(true);
    track.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-ep]');
      if (!b) return;
      if (window.Episodes) window.Episodes.openPlayer(b.dataset.ep);
      else location.href = '/episodes.html';
    });
  }

  // About page: the first four episodes ever recorded.
  function renderFirst(eps) {
    const el = document.getElementById('firstEpisodes');
    if (!el) return;
    const first = eps.slice().sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0)).filter(ep => ep.episodeNumber).slice(0, 4);
    el.innerHTML = first.map(ep => {
      const parts = window.epParts(ep);
      return `<a class="card episode-card" href="/episodes.html?search=${encodeURIComponent(parts.guest)}">
        <div class="thumb-wrap">${window.coverImg(ep, 520, 'cover')}</div>
        <div class="card-body"><h3>Ep ${ep.episodeNumber}: ${window.escAttr(parts.guest)}</h3>
          ${parts.line ? `<div class="episode-meta"><span>${window.escAttr(parts.line)}</span></div>` : ''}</div>
      </a>`;
    }).join('');
  }

  // A different conversation from the back catalogue each week.
  let spotList = [];
  let spotIndex = 0;
  function renderSpot() {
    const el = document.getElementById('spotlight');
    const ep = spotList[spotIndex];
    if (!el || !ep) return;
    const parts = window.epParts(ep);
    const year = ep.publishedAt ? new Date(ep.publishedAt).getFullYear() : '';
    el.innerHTML = `
      <div class="spot__art">${window.coverImg(ep, 720, 'cover', `data-ep="${window.escAttr(ep.id)}"`)}</div>
      <div>
        <div class="spot__kicker">From the archive &middot; Ep ${ep.episodeNumber || ''}${year ? ' &middot; ' + year : ''}</div>
        <h3>${window.escAttr(parts.guest)}</h3>
        ${parts.line ? `<div class="spot__line">${window.escAttr(parts.line)}</div>` : ''}
        <p class="spot__desc">${window.escAttr(blurb(ep))}</p>
        <div class="spot__actions">
          <button class="btn btn-primary" data-play="${window.escAttr(ep.id)}"><i data-lucide="play"></i> Play episode</button>
          <button class="btn btn-outline btn-sm" id="spotPrev" aria-label="Previous"><i data-lucide="arrow-left"></i></button>
          <button class="btn btn-outline btn-sm" id="spotNext" aria-label="Next"><i data-lucide="arrow-right"></i></button>
        </div>
      </div>`;
  }

  function wireSpot(eps) {
    const el = document.getElementById('spotlight');
    if (!el) return;
    spotList = eps.slice(24);
    if (!spotList.length) spotList = eps.slice();
    const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
    spotIndex = week % spotList.length;
    renderSpot();
    el.addEventListener('click', (e) => {
      const play = e.target.closest('[data-play]');
      const art = e.target.closest('img[data-ep]');
      if (play && window.Episodes) return window.Episodes.playInBar(play.dataset.play);
      if (art && window.Episodes) return window.Episodes.openPlayer(art.dataset.ep);
      if (e.target.closest('#spotPrev')) { spotIndex = (spotIndex - 1 + spotList.length) % spotList.length; renderSpot(); }
      if (e.target.closest('#spotNext')) { spotIndex = (spotIndex + 1) % spotList.length; renderSpot(); }
    });
  }

  window.getEpisodes().then((eps) => {
    if (!eps.length) {
      // No feed: drop the bands that are nothing without artwork.
      ['wallSection', 'spotSection', 'firstSection'].forEach(id => { const s = document.getElementById(id); if (s) s.style.display = 'none'; });
      return;
    }
    renderWall(eps);
    renderStats(eps);
    renderRoll(eps);
    wireSpot(eps);
    renderFirst(eps);
  });
})();
