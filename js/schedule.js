/* ============================================
   AEOB — Schedule Module
   Handles: timezone converter, push notification
   opt-in, upcoming/past episode display
   ============================================ */

const Schedule = (() => {
  // Show airs Saturday 10:00 AM Manila time (UTC+8)
  const SHOW_HOUR = 10;
  const SHOW_DAY = 6; // Saturday

  // Timezone data for converter
  const TIMEZONES = [
    { city: 'Manila', tz: 'Asia/Manila', flag: '🇵🇭' },
    { city: 'Los Angeles', tz: 'America/Los_Angeles', flag: '🇺🇸' },
    { city: 'New York', tz: 'America/New_York', flag: '🇺🇸' },
    { city: 'London', tz: 'Europe/London', flag: '🇬🇧' },
    { city: 'Dubai', tz: 'Asia/Dubai', flag: '🇦🇪' },
    { city: 'Sydney', tz: 'Australia/Sydney', flag: '🇦🇺' },
    { city: 'Tokyo', tz: 'Asia/Tokyo', flag: '🇯🇵' },
    { city: 'Toronto', tz: 'America/Toronto', flag: '🇨🇦' }
  ];

  // ---------- Get Next Saturday at 10 AM PHT ----------
  function getNextShowTime() {
    const now = new Date();
    // Get current time in Manila
    const manilaStr = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    const manila = new Date(manilaStr);

    let daysUntilSat = (SHOW_DAY - manila.getDay() + 7) % 7;
    if (daysUntilSat === 0 && manila.getHours() >= SHOW_HOUR + 2) {
      daysUntilSat = 7;
    }

    const nextShow = new Date(manila);
    nextShow.setDate(nextShow.getDate() + daysUntilSat);
    nextShow.setHours(SHOW_HOUR, 0, 0, 0);

    // Convert back to real Date accounting for Manila's UTC+8 offset
    const offset = now.getTime() - manila.getTime();
    return new Date(nextShow.getTime() + offset);
  }

  // ---------- Timezone Converter ----------
  function updateTimezones() {
    const nextShow = getNextShowTime();
    const grid = document.querySelector('.timezone-grid');
    if (!grid) return;

    grid.innerHTML = TIMEZONES.map(tz => {
      const options = {
        timeZone: tz.tz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      const dayOptions = {
        timeZone: tz.tz,
        weekday: 'long'
      };

      const timeStr = nextShow.toLocaleTimeString('en-US', options);
      const dayStr = nextShow.toLocaleDateString('en-US', dayOptions);

      return `
        <div class="tz-item">
          <div class="city">${tz.city}</div>
          <div class="time">${timeStr}</div>
          <div class="day">${dayStr}</div>
        </div>
      `;
    }).join('');
  }

  // ---------- Push Notifications ----------
  async function requestNotifications() {
    if (!('Notification' in window)) {
      window.showToast('Your browser does not support notifications', 'error');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      window.showToast('Notifications enabled! We\'ll remind you before each episode.', 'success');
      localStorage.setItem('aeob-notifications', 'enabled');
      updateNotificationBanner();

      // Register for push if service worker available
      if ('serviceWorker' in navigator) {
        try {
          // Service worker registration would go here for production
          console.log('Push notification registration would happen here');
        } catch (err) {
          console.error('Push registration failed:', err);
        }
      }
    } else {
      window.showToast('Notification permission denied. You can enable it in browser settings.', 'info');
    }
  }

  function updateNotificationBanner() {
    const banner = document.querySelector('.notification-banner');
    if (!banner) return;

    const enabled = localStorage.getItem('aeob-notifications') === 'enabled';
    const isLoggedIn = window.Auth?.isLoggedIn();

    banner.style.display = isLoggedIn ? 'flex' : 'none';

    const btn = banner.querySelector('.btn');
    if (btn && enabled) {
      btn.textContent = 'Notifications Enabled ✓';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    }
  }

  // ---------- Upcoming Episodes List ----------
  function renderUpcoming() {
    const container = document.getElementById('upcomingList');
    if (!container) return;

    const nextShow = getNextShowTime();
    const episodes = [];

    for (let i = 0; i < 4; i++) {
      const date = new Date(nextShow.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      episodes.push({
        date: date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        }),
        time: '10:00 AM PHT',
        topic: 'PLACEHOLDER: Topic to be announced',
        status: i === 0 ? 'Next Up' : 'Upcoming'
      });
    }

    container.innerHTML = episodes.map((ep, idx) => `
      <div class="card" style="padding:20px;display:flex;align-items:center;gap:16px;${idx === 0 ? 'border-left:4px solid var(--orange-accent);' : ''}">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:1rem;">${ep.date}</div>
          <div style="color:var(--text-secondary);font-size:0.9rem;">${ep.time} — ${ep.topic}</div>
        </div>
        <span class="badge" style="${idx === 0 ? 'background:var(--orange-accent);' : 'background:var(--gray-300);'}">${ep.status}</span>
      </div>
    `).join('');
  }

  // ---------- Auth State Listener ----------
  window.addEventListener('authStateChanged', () => {
    updateNotificationBanner();
  });

  // ---------- Init ----------
  function init() {
    updateTimezones();
    renderUpcoming();
    updateNotificationBanner();

    // Bind notification button
    const notifBtn = document.getElementById('enableNotificationsBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', requestNotifications);
    }

    // Update timezones every minute
    setInterval(updateTimezones, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { getNextShowTime, requestNotifications, TIMEZONES };
})();

window.Schedule = Schedule;
