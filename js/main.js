/* ============================================
   AEOB — Main JS
   Handles: preloader, header scroll, dark mode,
   mobile nav, back-to-top, scroll animations,
   toast notifications, tab switching, countdown
   ============================================ */

// ---------- Preloader ----------
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => preloader.classList.add('hidden'), 600);
  }
});

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
    darkToggle.innerHTML = theme === 'dark' ? '&#9788;' : '&#9790;';
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
const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

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
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
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

// ---------- Top 5 Picks (Homepage) ----------
(async function initTopPicks() {
  const grid = document.getElementById('topPicksGrid');
  if (!grid) return;

  let allPicks = {};

  try {
    const data = await window.apiFetch('top-picks');
    allPicks = data.picks || {};
  } catch (e) {
    return;
  }

  const hasPicks = Object.values(allPicks).some(arr => arr.length > 0);
  if (!hasPicks) return;

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
      const ytThumb = window.getYoutubeThumbnail ? window.getYoutubeThumbnail(pick.youtubeUrl) : '';
      const epNum = pick.episodeNumber || '';
      const thumbSrc = ytThumb || '';

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
