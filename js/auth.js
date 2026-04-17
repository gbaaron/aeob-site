/* ============================================
   AEOB — Auth Module
   Handles: signup, login, session management,
   profile state, and auth UI updates
   ============================================ */

const Auth = (() => {
  const TOKEN_KEY = 'aeob-token';
  const USER_KEY = 'aeob-user';

  // DOM elements
  const loginBtn = document.getElementById('loginBtn');
  const userAvatar = document.getElementById('userAvatar');
  const authModal = document.getElementById('authModal');
  const closeAuth = document.getElementById('closeAuth');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  // ---------- State ----------
  let currentUser = null;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        currentUser = JSON.parse(stored);
        return currentUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function isAdmin() {
    const u = getUser();
    if (!u) return false;
    return u.role === 'Admin' || u.role === 'SuperAdmin';
  }

  /** Authenticated fetch helper for admin endpoints. */
  async function authFetch(path, options = {}) {
    const token = getToken();
    const headers = Object.assign({
      'Content-Type': 'application/json'
    }, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const url = path.startsWith('/') ? path : ('/.netlify/functions/' + path);
    const res = await fetch(url, Object.assign({}, options, { headers }));
    let payload = null;
    try { payload = await res.json(); } catch { payload = null; }
    if (!res.ok) {
      const msg = (payload && payload.error) || ('Request failed (' + res.status + ')');
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return payload;
  }

  // ---------- UI Updates ----------
  function updateUI() {
    const user = getUser();
    const loggedIn = isLoggedIn();

    // Header avatar / login button
    if (loginBtn) loginBtn.style.display = loggedIn ? 'none' : 'block';
    if (userAvatar) {
      userAvatar.style.display = loggedIn ? 'flex' : 'none';
      if (user) {
        userAvatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      }
    }

    // Toggle logged-in class on body
    document.body.classList.toggle('logged-in', loggedIn);

    // Show/hide login-required sections
    document.querySelectorAll('.auth-required').forEach(el => {
      el.style.display = loggedIn ? '' : 'none';
    });
    document.querySelectorAll('.auth-guest').forEach(el => {
      el.style.display = loggedIn ? 'none' : '';
    });

    // Show admin-only elements only to admin users
    const admin = isAdmin();
    document.body.classList.toggle('is-admin', admin);
    document.querySelectorAll('[data-admin]').forEach(el => {
      el.style.display = admin ? '' : 'none';
    });

    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { loggedIn, user } }));
  }

  // ---------- Modal ----------
  function openModal() {
    if (authModal) authModal.classList.add('active');
  }

  function closeModal() {
    if (authModal) authModal.classList.remove('active');
  }

  // ---------- Signup ----------
  async function signup(name, email, password, favEra, favTeam) {
    try {
      const data = await window.apiFetch('auth-signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, favEra, favTeam })
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      currentUser = data.user;
      closeModal();
      updateUI();
      window.showToast(`Welcome to AEOB, ${data.user.name}!`, 'success');
      return data;
    } catch (err) {
      window.showToast(err.message || 'Signup failed. Please try again.', 'error');
      throw err;
    }
  }

  // ---------- Login ----------
  async function login(email, password) {
    try {
      const data = await window.apiFetch('auth-login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      currentUser = data.user;
      closeModal();
      updateUI();
      window.showToast(`Welcome back, ${data.user.name}!`, 'success');
      return data;
    } catch (err) {
      window.showToast(err.message || 'Login failed. Check your credentials.', 'error');
      throw err;
    }
  }

  // ---------- Logout ----------
  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    currentUser = null;
    updateUI();
    window.showToast('Signed out successfully.', 'info');
  }

  // ---------- Event Listeners ----------
  if (loginBtn) loginBtn.addEventListener('click', openModal);
  if (closeAuth) closeAuth.addEventListener('click', closeModal);

  // Close modal on backdrop click
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeModal();
    });
  }

  // Login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      await login(email, password);
    });
  }

  // Signup form submit
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const favEra = document.getElementById('favEra')?.value || '';
      const favTeam = document.getElementById('favTeam')?.value || '';
      await signup(name, email, password, favEra, favTeam);
    });
  }

  // User avatar click — show dropdown or logout
  if (userAvatar) {
    userAvatar.addEventListener('click', () => {
      if (confirm('Sign out of AEOB?')) {
        logout();
      }
    });
  }

  // Any "open login" trigger on the page
  document.querySelectorAll('[data-auth-trigger]').forEach(el => {
    el.addEventListener('click', openModal);
  });

  // Initialize on load
  updateUI();

  // ---------- Public API ----------
  return {
    isLoggedIn,
    isAdmin,
    getUser,
    getToken,
    authFetch,
    openModal,
    closeModal,
    login,
    signup,
    logout,
    updateUI
  };
})();

// Make Auth globally available
window.Auth = Auth;
