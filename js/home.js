/* ============================================
   AEOB — Home + About artwork
   Everything here is built from the live episode
   feed: the hero art wall and cover stack, the
   guest-name ticker, the scorebug numbers, the
   two-way cover wall, the archive spotlight and
   the closing band. Add an episode to the feed
   and it shows up in all of them with no second
   edit. Each block no-ops when its element is
   not on the page.
   ============================================ */

(function () {
  'use strict';

  const esc = (v) => window.escAttr(v);
  const $ = (id) => document.getElementById(id);

  function wallImgs(eps, w) {
    return eps.map(ep =>
      `<img src="${esc(window.epArt(ep, w))}" data-raw="${esc(ep.image || '')}" alt="" loading="lazy" decoding="async" onload="this.classList.add('is-in')" onerror="coverFallback(this)">`
    ).join('');
  }

  function renderWall(eps) {
    const el = $('artwall');
    if (el) el.innerHTML = wallImgs(eps.slice(3, 35), 260);
    const join = $('joinWall');
    if (join) join.innerHTML = wallImgs(eps.slice(35, 59), 220);
  }

  // The three newest covers, fanned. The front one plays.
  function renderStack(eps) {
    const el = $('heroStack');
    if (!el) return;
    const [a, b, c] = eps;
    if (!a) return;
    el.innerHTML = `
      ${c ? `<div class="stack__card stack__card--3">${window.coverImg(c, 520, 'cover')}</div>` : ''}
      ${b ? `<div class="stack__card stack__card--2">${window.coverImg(b, 520, 'cover')}</div>` : ''}
      <button type="button" class="stack__card stack__card--1" data-ep="${esc(a.id)}" aria-label="Play ${esc(a.title)}">
        ${window.coverImg(a, 720, 'cover')}
        <span class="stack__tag">New &middot; Ep ${a.episodeNumber || ''}</span>
        <span class="stack__play"><i data-lucide="play"></i></span>
      </button>`;
    el.addEventListener('click', (e) => {
      const b1 = e.target.closest('[data-ep]');
      if (b1 && window.Episodes) window.Episodes.playInBar(b1.dataset.ep);
    });
  }

  // Guest names, straight off the episode titles.
  function renderTicker(eps) {
    const track = $('tickerTrack');
    if (!track) return;
    const names = [];
    eps.forEach(ep => {
      const g = window.epParts(ep).guest;
      if (g && !/\d{4}|recap|greatest|special/i.test(g) && g.length < 34 && !names.includes(g)) names.push(g);
    });
    const run = (hidden) => `<span class="ticker__run"${hidden ? ' aria-hidden="true"' : ''}>${names.slice(0, 44).map(n => `<span>${esc(n)}</span>`).join('')}</span>`;
    track.innerHTML = run(false) + run(true);
  }

  function renderStats(eps) {
    const set = (id, v) => { const n = $(id); if (n) n.textContent = v; };
    set('statEpisodes', eps.length);
    const hours = Math.round(eps.reduce((sum, ep) => sum + (Number(ep.duration) || 0), 0) / 3600);
    if (hours) set('statHours', hours.toLocaleString());
    set('wallCount', eps.length);
  }

  // Two rows of covers travelling in opposite directions.
  function renderRoll(eps) {
    const tiles = (list, hidden) => list.map(ep =>
      `<button type="button" data-ep="${esc(ep.id)}" ${hidden ? 'aria-hidden="true" tabindex="-1"' : `aria-label="${esc(ep.title)}"`}>${window.coverImg(ep, 320, 'cover')}</button>`
    ).join('');
    [['wallTrack', eps.slice(5, 21)], ['wallTrack2', eps.slice(21, 37)]].forEach(([id, list]) => {
      const track = $(id);
      if (!track || !list.length) return;
      // Second copy makes the loop seamless.
      track.innerHTML = tiles(list, false) + tiles(list, true);
      track.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-ep]');
        if (!b) return;
        if (window.Episodes) window.Episodes.openPlayer(b.dataset.ep);
        else location.href = '/episodes.html';
      });
    });
  }

  // A different conversation from the back catalogue each week.
  let spotList = [];
  let spotIndex = 0;
  function renderSpot() {
    const el = $('spotlight');
    const ep = spotList[spotIndex];
    if (!el || !ep) return;
    const parts = window.epParts(ep);
    el.innerHTML = `
      <div class="spot__num" aria-hidden="true">${ep.episodeNumber || ''}</div>
      <div class="spot__art">${window.coverImg(ep, 720, 'cover', `data-ep="${esc(ep.id)}"`)}</div>
      <div class="spot__body">
        <div class="spot__kicker">From the archive &middot; Episode ${ep.episodeNumber || ''}</div>
        <h3>${esc(parts.guest)}</h3>
        ${parts.line ? `<div class="spot__line">${esc(parts.line)}</div>` : ''}
        <p class="spot__desc">${esc(window.epBlurb(ep, 240))}</p>
        <div class="spot__actions">
          <button class="btn btn-primary" data-play="${esc(ep.id)}"><i data-lucide="play"></i> Play episode</button>
          <button class="spot__step" id="spotPrev" aria-label="Previous"><i data-lucide="arrow-left"></i></button>
          <button class="spot__step" id="spotNext" aria-label="Next"><i data-lucide="arrow-right"></i></button>
        </div>
      </div>`;
  }

  function wireSpot(eps) {
    const el = $('spotlight');
    if (!el) return;
    spotList = eps.slice(37).filter(ep => window.epBlurb(ep, 240).length > 60);
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

  // About page: the first four episodes ever recorded.
  function renderFirst(eps) {
    const el = $('firstEpisodes');
    if (!el) return;
    const first = eps.slice().sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0)).filter(ep => ep.episodeNumber).slice(0, 4);
    el.innerHTML = first.map(ep => {
      const parts = window.epParts(ep);
      return `<a class="card episode-card" href="/episodes.html?search=${encodeURIComponent(parts.guest)}">
        <div class="thumb-wrap">${window.coverImg(ep, 520, 'cover')}</div>
        <div class="card-body"><div class="ep-num">Episode ${ep.episodeNumber}</div><h3>${esc(parts.guest)}</h3>
          ${parts.line ? `<p class="ep-line">${esc(parts.line)}</p>` : ''}</div>
      </a>`;
    }).join('');
  }

  window.getEpisodes().then((eps) => {
    if (!eps.length) {
      // No feed: drop the bands that are nothing without artwork.
      ['wallSection', 'spotSection', 'firstSection', 'tickerBand'].forEach(id => { const s = $(id); if (s) s.style.display = 'none'; });
      const stack = $('heroStack');
      if (stack) stack.innerHTML = `<img class="stack__logo" src="${window.AEOB_LOGO}" alt="An Eternity of Basketball logo">`;
      return;
    }
    renderWall(eps);
    renderStack(eps);
    renderTicker(eps);
    renderStats(eps);
    renderRoll(eps);
    wireSpot(eps);
    renderFirst(eps);
  });
})();
