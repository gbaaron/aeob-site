/* ============================================
   AEOB — Admin Panel Module
   Powers /admin.html: gate, tabs, stats,
   episodes, shop, predictions, submissions, users
   ============================================ */

(function () {
  'use strict';

  // ---------- Boot gate ----------
  const gateEl = document.getElementById('adminGate');
  const gateMsg = document.getElementById('adminGateMsg');
  const gateActions = document.getElementById('adminGateActions');
  const gateLoginBtn = document.getElementById('adminGateLogin');
  const shellEl = document.getElementById('adminShell');

  function showGateDenied(msg) {
    if (gateMsg) gateMsg.textContent = msg || 'You do not have permission to view this page.';
    if (gateActions) gateActions.style.display = 'flex';
  }

  function bootAdmin() {
    if (!window.Auth) {
      showGateDenied('Auth module failed to load.');
      return;
    }
    if (!Auth.isLoggedIn()) {
      showGateDenied('You must be signed in as an admin to view this page.');
      if (gateLoginBtn) gateLoginBtn.addEventListener('click', () => Auth.openModal());
      return;
    }
    if (!Auth.isAdmin()) {
      showGateDenied('Your account does not have admin privileges.');
      return;
    }

    // Hide gate, show shell
    if (gateEl) gateEl.style.display = 'none';
    if (shellEl) shellEl.style.display = 'grid';

    // Populate user chip
    const u = Auth.getUser();
    if (u) {
      const nameEl = document.getElementById('adminUserName');
      const roleEl = document.getElementById('adminUserRole');
      const avatarEl = document.getElementById('adminUserAvatar');
      if (nameEl) nameEl.textContent = u.name || 'Admin';
      if (roleEl) roleEl.textContent = u.role || 'Admin';
      if (avatarEl) avatarEl.textContent = (u.name || 'A').charAt(0).toUpperCase();
    }

    initTabs();
    loadOverview();
  }

  // ---------- Tab switcher ----------
  const loadedTabs = new Set();

  function initTabs() {
    document.querySelectorAll('.admin-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        activateTab(tab);
      });
    });
  }

  function activateTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.admin-panel').forEach(p => {
      p.classList.toggle('active', p.id === 'panel-' + tab);
    });
    // Lazy-load on first visit
    if (!loadedTabs.has(tab)) {
      loadedTabs.add(tab);
      if (tab === 'episodes') loadEpisodes();
      else if (tab === 'shop') loadProducts();
      else if (tab === 'predictions') loadPredictions();
      else if (tab === 'submissions') loadSubmissions();
      else if (tab === 'users') loadUsers();
    }
  }

  // ---------- Helpers ----------
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  function toast(msg, type) {
    if (window.showToast) window.showToast(msg, type || 'info');
    else console.log('[toast]', msg);
  }

  // ---------- Overview ----------
  async function loadOverview() {
    try {
      const data = await Auth.authFetch('admin-stats');
      const stats = data.stats || {};
      document.querySelectorAll('[data-stat]').forEach(el => {
        const key = el.dataset.stat;
        const v = stats[key];
        el.textContent = (v == null) ? '—' : v;
      });
      // Missing tables
      const missing = data.missingTables || {};
      const missingNames = Object.keys(missing).filter(k => missing[k]);
      const note = document.getElementById('missingTablesNote');
      const list = document.getElementById('missingTablesList');
      if (missingNames.length && note && list) {
        list.innerHTML = missingNames.map(n => '<li><code>' + esc(n) + '</code></li>').join('');
        note.style.display = 'block';
      }
    } catch (err) {
      toast('Failed to load stats: ' + err.message, 'error');
    }
  }

  // ---------- Episodes ----------
  let episodesCache = [];

  async function loadEpisodes() {
    const tbody = document.querySelector('#episodesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="muted-sm">Loading...</td></tr>';
    try {
      const data = await Auth.authFetch('admin-episodes');
      episodesCache = data.episodes || [];
      renderEpisodes(episodesCache);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted-sm">Failed: ' + esc(err.message) + '</td></tr>';
    }
  }

  function renderEpisodes(list) {
    const tbody = document.querySelector('#episodesTable tbody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted-sm">No episodes found.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(ep => `
      <tr data-id="${esc(ep.id)}">
        <td>${esc(ep.episodeNumber || '')}</td>
        <td>
          <strong>${esc(ep.title || 'Untitled')}</strong>
          <div class="muted-sm">${esc(formatDate(ep.airDate))}</div>
        </td>
        <td><input type="checkbox" class="ep-featured" ${ep.featured ? 'checked' : ''}></td>
        <td><input type="url" class="form-input ep-audio" value="${esc(ep.audioUrl || '')}" placeholder="https://..."></td>
        <td><button class="btn btn-primary btn-sm ep-save">Save</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.ep-save').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const id = tr.dataset.id;
        const featured = tr.querySelector('.ep-featured').checked;
        const audioUrl = tr.querySelector('.ep-audio').value.trim();
        btn.disabled = true;
        btn.textContent = 'Saving...';
        try {
          await Auth.authFetch('admin-episodes', {
            method: 'PATCH',
            body: JSON.stringify({ id, fields: { Featured: featured, AudioURL: audioUrl } })
          });
          toast('Episode updated.', 'success');
          btn.textContent = 'Saved';
          setTimeout(() => { btn.textContent = 'Save'; btn.disabled = false; }, 1200);
        } catch (err) {
          toast('Save failed: ' + err.message, 'error');
          btn.textContent = 'Save';
          btn.disabled = false;
        }
      });
    });
  }

  const epSearch = document.getElementById('episodeSearch');
  if (epSearch) {
    epSearch.addEventListener('input', () => {
      const q = epSearch.value.toLowerCase();
      const filtered = episodesCache.filter(ep =>
        (ep.title || '').toLowerCase().includes(q) ||
        String(ep.episodeNumber || '').includes(q)
      );
      renderEpisodes(filtered);
    });
  }
  const refreshEp = document.getElementById('refreshEpisodes');
  if (refreshEp) refreshEp.addEventListener('click', loadEpisodes);

  // ---------- Shop / Products ----------
  let productsCache = [];

  async function loadProducts() {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="muted-sm">Loading...</td></tr>';
    try {
      const data = await Auth.authFetch('admin-shop');
      productsCache = data.products || [];
      renderProducts(productsCache);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted-sm">Failed: ' + esc(err.message) + '</td></tr>';
    }
  }

  function renderProducts(list) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted-sm">No products yet. Click "+ New Product" to add one.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(p => `
      <tr data-id="${esc(p.id)}">
        <td>
          <strong>${esc(p.name || 'Unnamed')}</strong>
          <div class="muted-sm">${esc(p.slug || '')}</div>
        </td>
        <td>₱${esc(p.price || 0)}</td>
        <td>${esc(p.category || '—')}</td>
        <td>${esc(p.stock == null ? '—' : p.stock)}</td>
        <td><span class="admin-status admin-status-${esc((p.status || 'draft').toLowerCase())}">${esc(p.status || 'Draft')}</span></td>
        <td>
          <button class="btn btn-outline btn-sm prod-edit">Edit</button>
          <button class="btn btn-danger btn-sm prod-del">&times;</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.prod-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('tr').dataset.id;
        const p = productsCache.find(x => x.id === id);
        if (p) openProductModal(p);
      });
    });
    tbody.querySelectorAll('.prod-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('tr').dataset.id;
        if (!confirm('Delete this product? This cannot be undone.')) return;
        try {
          await Auth.authFetch('admin-shop?id=' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Product deleted.', 'success');
          loadProducts();
        } catch (err) {
          toast('Delete failed: ' + err.message, 'error');
        }
      });
    });
  }

  const refreshProd = document.getElementById('refreshProducts');
  if (refreshProd) refreshProd.addEventListener('click', loadProducts);
  const newProdBtn = document.getElementById('newProductBtn');
  if (newProdBtn) newProdBtn.addEventListener('click', () => openProductModal(null));

  // Product modal
  function openProductModal(product) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('productId').value = '';
    title.textContent = product ? 'Edit Product' : 'New Product';

    if (product) {
      document.getElementById('productId').value = product.id;
      Object.entries({
        Name: product.name, Slug: product.slug, Description: product.description,
        Price: product.price, ComparePrice: product.comparePrice, Category: product.category,
        Badge: product.badge, Color: product.color, Stock: product.stock,
        Status: product.status, SortOrder: product.sortOrder,
        Sizes: Array.isArray(product.sizes) ? product.sizes.join(', ') : (product.sizes || ''),
        ImageURL: product.imageUrl
      }).forEach(([k, v]) => {
        const el = form.elements[k];
        if (el && v != null) el.value = v;
      });
    }

    modal.classList.add('active');
  }

  const productForm = document.getElementById('productForm');
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('productId').value;
      const fd = new FormData(productForm);
      const fields = {};
      for (const [k, v] of fd.entries()) {
        if (v === '' || v == null) continue;
        fields[k] = v;
      }
      // Auto-slug
      if (!fields.Slug && fields.Name) {
        fields.Slug = String(fields.Name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      try {
        if (id) {
          await Auth.authFetch('admin-shop', {
            method: 'PATCH',
            body: JSON.stringify({ id, fields })
          });
          toast('Product updated.', 'success');
        } else {
          await Auth.authFetch('admin-shop', {
            method: 'POST',
            body: JSON.stringify({ fields })
          });
          toast('Product created.', 'success');
        }
        document.getElementById('productModal').classList.remove('active');
        loadProducts();
      } catch (err) {
        toast('Save failed: ' + err.message, 'error');
      }
    });
  }

  // ---------- Predictions ----------
  let predictionsCache = [];

  async function loadPredictions() {
    const list = document.getElementById('predictionsList');
    if (!list) return;
    list.innerHTML = '<p class="muted-sm">Loading...</p>';
    try {
      const data = await Auth.authFetch('admin-predictions');
      predictionsCache = data.predictions || [];
      renderPredictions(predictionsCache);
    } catch (err) {
      list.innerHTML = '<p class="muted-sm">Failed: ' + esc(err.message) + '</p>';
    }
  }

  function renderPredictions(list) {
    const container = document.getElementById('predictionsList');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<p class="muted-sm">No predictions yet. Click "+ New Question" to add one.</p>';
      return;
    }
    container.innerHTML = list.map(p => `
      <div class="admin-card" data-id="${esc(p.id)}">
        <div class="admin-card-head">
          <h4>${esc(p.question || 'Untitled')}</h4>
          <span class="admin-status admin-status-${esc((p.status || 'open').toLowerCase())}">${esc(p.status || 'Open')}</span>
        </div>
        <div class="muted-sm">${esc(p.episode || '')}</div>
        <ul class="admin-option-list">
          ${(p.options || []).map(o => `<li${p.correctAnswer === o ? ' class="correct"' : ''}>${esc(o)}${p.correctAnswer === o ? ' &check;' : ''}</li>`).join('')}
        </ul>
        <div class="admin-card-actions">
          <button class="btn btn-outline btn-sm pred-edit">Edit</button>
          <button class="btn btn-danger btn-sm pred-del">Delete</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.pred-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('.admin-card').dataset.id;
        const p = predictionsCache.find(x => x.id === id);
        if (p) openPredictionModal(p);
      });
    });
    container.querySelectorAll('.pred-del').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.closest('.admin-card').dataset.id;
        if (!confirm('Delete this prediction?')) return;
        try {
          await Auth.authFetch('admin-predictions?id=' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Prediction deleted.', 'success');
          loadPredictions();
        } catch (err) {
          toast('Delete failed: ' + err.message, 'error');
        }
      });
    });
  }

  const refreshPred = document.getElementById('refreshPredictions');
  if (refreshPred) refreshPred.addEventListener('click', loadPredictions);
  const newPredBtn = document.getElementById('newPredictionBtn');
  if (newPredBtn) newPredBtn.addEventListener('click', () => openPredictionModal(null));

  function openPredictionModal(p) {
    const modal = document.getElementById('predictionModal');
    const title = document.getElementById('predictionModalTitle');
    const form = document.getElementById('predictionForm');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('predictionId').value = '';
    title.textContent = p ? 'Edit Prediction' : 'New Prediction';

    if (p) {
      document.getElementById('predictionId').value = p.id;
      form.elements.Question.value = p.question || '';
      form.elements.Episode.value = p.episode || '';
      form.elements.Options.value = (p.options || []).join('\n');
      form.elements.Status.value = p.status || 'Open';
      form.elements.CorrectAnswer.value = p.correctAnswer || '';
    }

    modal.classList.add('active');
  }

  const predForm = document.getElementById('predictionForm');
  if (predForm) {
    predForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('predictionId').value;
      const fd = new FormData(predForm);
      const fields = {
        Question: fd.get('Question') || '',
        Episode: fd.get('Episode') || '',
        Status: fd.get('Status') || 'Open',
        CorrectAnswer: fd.get('CorrectAnswer') || '',
        Options: (fd.get('Options') || '').toString().split('\n').map(s => s.trim()).filter(Boolean)
      };
      try {
        if (id) {
          await Auth.authFetch('admin-predictions', {
            method: 'PATCH',
            body: JSON.stringify({ id, fields })
          });
          toast('Prediction updated.', 'success');
        } else {
          await Auth.authFetch('admin-predictions', {
            method: 'POST',
            body: JSON.stringify({ fields })
          });
          toast('Prediction created.', 'success');
        }
        document.getElementById('predictionModal').classList.remove('active');
        loadPredictions();
      } catch (err) {
        toast('Save failed: ' + err.message, 'error');
      }
    });
  }

  // ---------- Submissions ----------
  async function loadSubmissions() {
    const list = document.getElementById('submissionsList');
    if (!list) return;
    list.innerHTML = '<p class="muted-sm">Loading...</p>';
    try {
      const filter = document.getElementById('submissionFilter');
      const status = filter ? filter.value : 'Pending';
      const qs = status ? ('?status=' + encodeURIComponent(status)) : '';
      const data = await Auth.authFetch('admin-submissions' + qs);
      renderSubmissions(data.submissions || []);
    } catch (err) {
      list.innerHTML = '<p class="muted-sm">Failed: ' + esc(err.message) + '</p>';
    }
  }

  function renderSubmissions(list) {
    const container = document.getElementById('submissionsList');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = '<p class="muted-sm">No submissions match this filter.</p>';
      return;
    }
    container.innerHTML = list.map(s => `
      <div class="admin-card" data-id="${esc(s.id)}">
        <div class="admin-card-head">
          <h4>${esc(s.name || 'Anonymous')}</h4>
          <span class="admin-status admin-status-${esc((s.status || 'pending').toLowerCase())}">${esc(s.status || 'Pending')}</span>
        </div>
        <div class="muted-sm">${esc(s.type || 'submission')} &middot; ${esc(formatDate(s.createdAt))}</div>
        <p>${esc(s.message || s.question || '')}</p>
        <div class="admin-card-actions">
          <button class="btn btn-primary btn-sm sub-approve">Approve</button>
          <button class="btn btn-outline btn-sm sub-reject">Reject</button>
          <button class="btn btn-outline btn-sm sub-feature">${s.featured ? 'Unfeature' : 'Feature'}</button>
          <button class="btn btn-danger btn-sm sub-del">Delete</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.admin-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.sub-approve').addEventListener('click', () => updateSub(id, { Status: 'Approved' }));
      card.querySelector('.sub-reject').addEventListener('click', () => updateSub(id, { Status: 'Rejected' }));
      card.querySelector('.sub-feature').addEventListener('click', () => {
        const cur = card.querySelector('.sub-feature').textContent.trim();
        updateSub(id, { Featured: cur === 'Feature' });
      });
      card.querySelector('.sub-del').addEventListener('click', async () => {
        if (!confirm('Delete this submission?')) return;
        try {
          await Auth.authFetch('admin-submissions?id=' + encodeURIComponent(id), { method: 'DELETE' });
          toast('Submission deleted.', 'success');
          loadSubmissions();
        } catch (err) {
          toast('Delete failed: ' + err.message, 'error');
        }
      });
    });
  }

  async function updateSub(id, fields) {
    try {
      await Auth.authFetch('admin-submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, fields })
      });
      toast('Submission updated.', 'success');
      loadSubmissions();
    } catch (err) {
      toast('Update failed: ' + err.message, 'error');
    }
  }

  const subFilter = document.getElementById('submissionFilter');
  if (subFilter) subFilter.addEventListener('change', loadSubmissions);
  const refreshSub = document.getElementById('refreshSubmissions');
  if (refreshSub) refreshSub.addEventListener('click', loadSubmissions);

  // ---------- Users ----------
  let usersCache = [];

  async function loadUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="muted-sm">Loading...</td></tr>';
    try {
      const data = await Auth.authFetch('admin-users');
      usersCache = data.users || [];
      renderUsers(usersCache);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted-sm">Failed: ' + esc(err.message) + '</td></tr>';
    }
  }

  function renderUsers(list) {
    const tbody = document.querySelector('#usersTable tbody');
    if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="muted-sm">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(u => `
      <tr>
        <td>${esc(u.name || '—')}</td>
        <td>${esc(u.email || '—')}</td>
        <td><span class="admin-status admin-status-${esc((u.role || 'user').toLowerCase())}">${esc(u.role || 'User')}</span></td>
        <td>${esc(u.tier || 'Rookie')}</td>
        <td>${esc(u.points || 0)}</td>
        <td class="muted-sm">${esc(u.favEra || '—')} / ${esc(u.favTeam || '—')}</td>
      </tr>
    `).join('');
  }

  const userSearch = document.getElementById('userSearch');
  if (userSearch) {
    userSearch.addEventListener('input', () => {
      const q = userSearch.value.toLowerCase();
      const filtered = usersCache.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
      renderUsers(filtered);
    });
  }
  const refreshU = document.getElementById('refreshUsers');
  if (refreshU) refreshU.addEventListener('click', loadUsers);

  // ---------- Modal close handlers ----------
  document.querySelectorAll('.admin-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) {
        modal.classList.remove('active');
      }
    });
  });

  // ---------- Start ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAdmin);
  } else {
    bootAdmin();
  }
})();
