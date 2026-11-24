/* ============================================
   AEOB — Main JS
   Handles: preloader, header scroll, dark mode,
   mobile nav, back-to-top, scroll animations,
   toast notifications, tab switching, countdown
   ============================================ */

// ---------- Preloader ----------
// Lifts as soon as the page is laid out. Waiting for window 'load' held the
// whole site behind a spinner until every cover image had downloaded.
(function () {
  const lift = () => { const p = document.getElementById('preloader'); if (p) p.classList.add('hidden'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(lift, 250));
  else setTimeout(lift, 250);
})();

// ---------- Header Scroll Effect ----------
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;
  if (header) {
    header.classList.toggle('scrolled', currentScroll > 20);
  }
  lastScroll = currentScroll;
});

// ---------- Dark Mode Toggle ----------
const darkToggle = document.getElementById('darkToggle');
const html = document.documentElement;

function setTheme(theme) {
  html.setAttribute('data-theme', theme);
  localStorage.setItem('aeob-theme', theme);
  if (darkToggle) {
    darkToggle.innerHTML = `<i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}"></i>`;
  }
}

// Load saved theme
const savedTheme = localStorage.getItem('aeob-theme') || 'light';
setTheme(savedTheme);

if (darkToggle) {
  darkToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
}

// ---------- Mobile Nav ----------
const hamburger = document.getElementById('hamburger');
const nav = document.getElementById('nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    nav.classList.toggle('open');
    hamburger.classList.toggle('active');
  });

  // Close nav when clicking a link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      hamburger.classList.remove('active');
    });
  });
}

// ---------- Back to Top ----------
const backToTop = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  if (backToTop) {
    backToTop.classList.toggle('visible', window.scrollY > 400);
  }
});

if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ---------- Scroll-Triggered Animations ----------
// Reveal once, never re-fire. Anything already on screen is shown without
// waiting for the observer, and a timeout is the floor: content that failed
// to animate is fine, content that stayed invisible is not.
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -8% 0px' });

window.wireReveal = function(root) {
  const vh = window.innerHeight || 800;
  (root || document).querySelectorAll('.reveal:not(.visible), .reveal-left:not(.visible), .reveal-right:not(.visible)').forEach(el => {
    if (el.dataset.revealWired) return;
    el.dataset.revealWired = '1';
    const r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) el.classList.add('visible');
    else revealObserver.observe(el);
  });
};
window.wireReveal();
setTimeout(() => {
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(el => {
    if (!el.classList.contains('visible') && el.getBoundingClientRect().top < (window.innerHeight || 800) * 1.4) el.classList.add('visible');
  });
}, 1400);

// ---------- Hero Counter Animation ----------
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    if (isNaN(target)) return;
    const duration = 1500;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        el.textContent = target + '+';
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current);
      }
    }, 16);
  });
}

// Run counter animation when hero is visible
const heroSection = document.getElementById('hero');
if (heroSection) {
  const heroObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animateCounters();
      heroObserver.disconnect();
    }
  }, { threshold: 0.3 });
  heroObserver.observe(heroSection);
}

// ---------- Tab Switching ----------
document.querySelectorAll('.tabs').forEach(tabsContainer => {
  const buttons = tabsContainer.querySelectorAll('.tab-btn');
  const parent = tabsContainer.parentElement;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;

      // Deactivate all tabs and panels in this group
      buttons.forEach(b => b.classList.remove('active'));
      if (parent) {
        parent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      }

      // Activate clicked tab and corresponding panel
      btn.classList.add('active');
      const panel = parent ? parent.querySelector(`#${tabId}`) : document.getElementById(tabId);
      if (panel) panel.classList.add('active');
    });
  });
});

// ---------- Toast Notifications ----------
window.showToast = function(message, type = 'info', duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type} visible`;

  setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
};

// ---------- Mini Countdown (Homepage) ----------
function getNextSaturday10AM() {
  const now = new Date();
  // Target: Saturday 10:00 AM Manila time (UTC+8)
  const manila = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const day = manila.getDay();
  let daysUntilSat = (6 - day + 7) % 7;
  if (daysUntilSat === 0) {
    // It's Saturday — check if we've passed 10 AM
    if (manila.getHours() >= 12) {
      daysUntilSat = 7; // next Saturday
    }
  }

  const next = new Date(manila);
  next.setDate(next.getDate() + daysUntilSat);
  next.setHours(10, 0, 0, 0);

  // Convert back to UTC by subtracting 8 hours
  const utcNext = new Date(next.getTime());
  // We need the actual UTC time for the countdown, account for Manila being UTC+8
  const offset = now.getTime() - manila.getTime();
  return new Date(next.getTime() + offset);
}

function updateMiniCountdown() {
  const target = getNextSaturday10AM();
  const now = new Date();
  const diff = target - now;

  if (diff <= 0) {
    // Show is live or just passed
    const days = document.getElementById('mc-days') || document.getElementById('cd-days');
    if (days) {
      days.textContent = '0';
      (document.getElementById('mc-hours') || document.getElementById('cd-hours')).textContent = '0';
      (document.getElementById('mc-mins') || document.getElementById('cd-mins')).textContent = '0';
      (document.getElementById('mc-secs') || document.getElementById('cd-secs')).textContent = '0';
    }
    return;
  }

  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const s = Math.floor((diff % (1000 * 60)) / 1000);

  // Mini countdown (homepage)
  const mcDays = document.getElementById('mc-days');
  if (mcDays) {
    mcDays.textContent = d;
    document.getElementById('mc-hours').textContent = h;
    document.getElementById('mc-mins').textContent = m;
    document.getElementById('mc-secs').textContent = s;
  }

  // Full countdown (schedule page)
  const cdDays = document.getElementById('cd-days');
  if (cdDays) {
    cdDays.textContent = d;
    document.getElementById('cd-hours').textContent = h;
    document.getElementById('cd-mins').textContent = m;
    document.getElementById('cd-secs').textContent = s;
  }
}

// Set next episode date text
function setNextEpisodeDate() {
  const target = getNextSaturday10AM();
  const options = { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' };
  const dateStr = target.toLocaleDateString('en-US', options) + ' at 10:00 AM PHT';

  const el1 = document.getElementById('nextEpisodeDate');
  const el2 = document.getElementById('nextEpisodeDateFull');
  if (el1) el1.textContent = dateStr;
  if (el2) el2.textContent = dateStr;
}

setNextEpisodeDate();
updateMiniCountdown();
setInterval(updateMiniCountdown, 1000);

// ---------- Auth Modal Tabs ----------
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const targetForm = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    const form = document.getElementById(targetForm + 'Form');
    if (form) form.classList.add('active');
  });
});

// ---------- Utility: API Helper ----------
window.apiFetch = async function(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('aeob-token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`/.netlify/functions/${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    console.error(`API error (${endpoint}):`, err);
    throw err;
  }
};

// ---------- Utility: Format Date ----------
window.formatDate = function(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ---------- Utility: Extract YouTube ID from URL ----------
window.extractYoutubeId = function(url) {
  if (!url) return '';
  // Handle various YouTube URL formats including /live/
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/ // bare ID
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return '';
};

// ---------- Utility: YouTube Thumbnail from URL ----------
window.getYoutubeThumbnail = function(url) {
  const id = window.extractYoutubeId(url);
  if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  return '';
};

// ---------- Utility: Format Duration ----------
window.formatDuration = function(seconds) {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ---------- Artwork ----------
// The show's own cover art comes down the RSS feed at 3000x3000 (~2.6MB).
// On Netlify it is resized through the Image CDN (see [images] in netlify.toml);
// if that ever fails the <img> falls back to the original file, then to the logo.
window.AEOB_LOGO = 'https://res.cloudinary.com/djngpyv15/image/upload/v1776447309/274701765_319754193505498_1268754374260370953_n-removebg-preview_k6uyha.png';

window.escAttr = function(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

window.coverUrl = function(src, w) {
  if (!src) return '';
  if (!/^https:\/\/d3t3ozftmdmh3i\.cloudfront\.net\//.test(src)) return src;
  // A local preview has no image service of its own, so borrow the live site's.
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname) || location.protocol === 'file:';
  return `${local ? 'https://aeob.netlify.app' : ''}/.netlify/images?url=${encodeURIComponent(src)}&w=${w || 480}&q=72`;
};

// Best available art for an episode: its cover, then its YouTube frame.
window.epArt = function(ep, w) {
  if (!ep) return '';
  return window.coverUrl(ep.image, w) || window.getYoutubeThumbnail(ep.youtubeUrl || '') || '';
};

window.coverFallback = function(img) {
  const raw = img.getAttribute('data-raw');
  if (raw && img.src !== raw && !img.dataset.triedRaw) { img.dataset.triedRaw = '1'; img.src = raw; return; }
  img.onerror = null;
  img.src = window.AEOB_LOGO;
  img.classList.add('is-logo-fallback');
};

// <img> for an episode cover. Square, never cropped.
window.coverImg = function(ep, w, cls, extra) {
  const src = window.epArt(ep, w) || window.AEOB_LOGO;
  return `<img class="${cls || 'cover'}" src="${window.escAttr(src)}" data-raw="${window.escAttr(ep.image || '')}" alt="${window.escAttr(ep.title || '')}" loading="lazy" decoding="async" onerror="coverFallback(this)" ${extra || ''}>`;
};

// Episode titles arrive as "Guest: What they did | Ep. 272".
window.epParts = function(ep) {
  const t = String(ep.title || '').replace(/\s*\|\s*Ep\.?\s*\d+\s*$/i, '').replace(/^EPISODE\s*\d+[:\s-]*/i, '');
  const i = t.indexOf(':');
  return i > 0 ? { guest: t.slice(0, i).trim(), line: t.slice(i + 1).trim() } : { guest: t.trim(), line: '' };
};

// Show notes end in the same boilerplate every week; keep the part about the guest.
window.epBlurb = function(ep, max) {
  const text = String(ep.description || '').replace(/<[^>]+>/g, ' ')
    .split(/Hosted by|Watch this episode|Follow the show|Support the show/i)[0]
    .replace(/\s+/g, ' ').trim();
  max = max || 200;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
};

// One shared promise so every module reads the same episode list.
window.getEpisodes = function() {
  if (!window._aeobEpisodes) {
    window._aeobEpisodes = window.apiFetch('episodes-list?pageSize=500')
      .then(d => d.episodes || [])
      .catch(() => []);
  }
  return window._aeobEpisodes;
};

function hideSection(el) {
  const sec = el && el.closest('section');
  if (sec) sec.style.display = 'none';
}

// ---------- Inner-page heroes wear the cover art too ----------
(function pageHeroArt() {
  const hero = document.querySelector('.page-hero, .live-hero, .cards-hero, .predict-hero, .shop-hero, .trivia-hero');
  if (!hero) return;
  window.getEpisodes().then(eps => {
    if (eps.length < 12) return;
    // Start at a different point per page so no two heroes show the same faces.
    const start = (location.pathname.length * 7) % Math.max(1, eps.length - 30);
    const art = document.createElement('div');
    art.className = 'page-hero__art';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = eps.slice(start, start + 24).map(ep =>
      `<img src="${window.escAttr(window.epArt(ep, 220))}" data-raw="${window.escAttr(ep.image || '')}" alt="" decoding="async" onload="this.classList.add('is-in')" onerror="coverFallback(this)">`
    ).join('');
    hero.prepend(art);
  });
})();

// ---------- Icons (Lucide) ----------
// Pages build markup at runtime, so icons are drawn whenever an <i data-lucide>
// lands in the document rather than once on load.
(function wireIcons() {
  let queued = false;
  function draw() {
    queued = false;
    if (window.lucide && document.querySelector('i[data-lucide]')) window.lucide.createIcons();
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(draw); } }
  const s = document.createElement('script');
  s.src = 'https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js';
  s.onload = queue;
  document.head.appendChild(s);
  new MutationObserver(queue).observe(document.documentElement, { childList: true, subtree: true });
})();

// ---------- Top 5 Picks (Homepage) ----------
(async function initTopPicks() {
  const grid = document.getElementById('topPicksGrid');
  if (!grid) return;

  let allPicks = {};

  try {
    const data = await window.apiFetch('top-picks');
    allPicks = data.picks || {};
  } catch (e) {
    hideSection(grid);
    return;
  }

  const hasPicks = Object.values(allPicks).some(arr => arr.length > 0);
  if (!hasPicks) { hideSection(grid); return; }

  // Display order
  const pickerOrder = ['Charlie Cuna', 'Sid Ventura', 'Noel Zarate', 'Jay Mercado', 'Aaron', 'Carla'];
  const initials = { 'Charlie Cuna': 'CC', 'Sid Ventura': 'SV', 'Noel Zarate': 'NZ', 'Jay Mercado': 'JM', 'Aaron': 'AA', 'Carla': 'CA' };

  let html = '<div class="picks-all-grid">';

  pickerOrder.forEach(picker => {
    const picks = allPicks[picker] || [];
    if (picks.length === 0) return;

    html += `<div class="picker-column card">
      <div class="picker-header">
        <div class="host-avatar" style="display:flex;width:48px;height:48px;font-size:1rem;">${initials[picker] || '?'}</div>
        <h3>${picker}</h3>
      </div>
      <ol class="picker-list">`;

    picks.forEach(pick => {
      const epNum = pick.episodeNumber || '';
      const thumbSrc = window.epArt(pick, 160);

      html += `<li class="picker-item">
        ${thumbSrc ? `<img src="${thumbSrc}" alt="" class="picker-item-thumb" loading="lazy">` : ''}
        <span class="picker-item-title">Ep ${epNum}: ${pick.title.replace(/^EPISODE\s*\d+[:\s-]*/i, '')}</span>
      </li>`;
    });

    html += `</ol></div>`;
  });

  html += '</div>';
  grid.innerHTML = html;
})();

// ---------- Featured Lists (Homepage) ----------
(async function initFeaturedLists() {
  const grid = document.getElementById('featuredListsGrid');
  if (!grid) return;

  let lists = {};
  try {
    const data = await window.apiFetch('featured-lists');
    lists = data.lists || {};
  } catch (e) {
    hideSection(grid);
    return;
  }

  const icons = {
    'Top 10 of the Year': '<i data-lucide="trophy"></i>',
    'Trending Last 30 Days': '<i data-lucide="flame"></i>',
    'All-Time Greatest': '<i data-lucide="sparkles"></i>'
  };
  const order = ['All-Time Greatest', 'Top 10 of the Year', 'Trending Last 30 Days'];

  let html = '';
  order.forEach(listType => {
    const items = lists[listType] || [];
    if (items.length === 0) return;

    html += `<div class="picker-column card">
      <div class="picker-header">
        <span style="font-size:1.8rem;">${icons[listType] || ''}</span>
        <h3>${listType}</h3>
      </div>
      <ol class="picker-list">`;

    items.forEach(item => {
      const ytThumb = window.epArt(item, 160);
      const epNum = item.episodeNumber || '';
      const label = item.title.replace(/^EPISODE\s*\d+[:\s-]*/i, '');

      html += `<li class="picker-item">
        ${ytThumb ? `<img src="${ytThumb}" alt="" class="picker-item-thumb" loading="lazy">` : ''}
        <span class="picker-item-title">Ep ${epNum}: ${label}</span>
      </li>`;
    });

    html += `</ol></div>`;
  });

  if (html) grid.innerHTML = html; else hideSection(grid);
})();
