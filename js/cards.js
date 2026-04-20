/* ============================================
   AEOB — Digital Trading Cards
   Fetches cards from /.netlify/functions/cards-list,
   renders the grid, wires filters/search, and
   drives the card detail modal.
   ============================================ */

const FALLBACK_CARDS = [
  {
    id: 'demo-1', cardId: 'AEOB-001', title: 'The Big J',
    subjectName: 'Robert Jaworski', team: 'Toyota Tamaraws', era: '1970s', position: 'PG',
    rarity: 'Legendary', cardNumber: '1', cardTotal: '100', holographic: true,
    bio: 'The Living Legend. Captain of the Toyota Tamaraws and the heart of Philippine basketball for three decades.',
    reward: '20% off all AEOB merch + priority episode access',
    bonusPerk: 'Exclusive Zoom meet with the AEOB hosts',
    advantage: 'DISCOUNT', advantageDetail: '20% off all merch in the AEOB shop',
    credits: 500, primaryColor: '#1a1f5e', secondaryColor: '#cc2030',
    stats: { offense: 88, defense: 92, handles: 90, shooting: 78, rebounding: 70, iq: 99 },
    specialAbility: 'Never Say Die — refuses to lose in the 4th quarter.',
    image: '', status: 'Active', sortOrder: 1, circulation: '100 minted',
    redeemUrl: ''
  },
  {
    id: 'demo-2', cardId: 'AEOB-002', title: 'Mr. Triple Double',
    subjectName: 'Ramon Fernandez', team: 'Crispa Redmanizers', era: '1970s', position: 'C',
    rarity: 'Epic', cardNumber: '2', cardTotal: '250', holographic: false,
    bio: 'El Presidente. Four-time MVP and the only Filipino big man to consistently post triple-doubles in the PBA.',
    reward: 'Exclusive "Triple Crown" tee access',
    bonusPerk: 'Signed episode shoutout',
    advantage: 'MERCH', advantageDetail: 'Unlocks the limited Triple Crown tee',
    credits: 300, primaryColor: '#cc2030', secondaryColor: '#f4a62a',
    stats: { offense: 86, defense: 88, handles: 65, shooting: 80, rebounding: 94, iq: 92 },
    specialAbility: 'Four-Peat — stats get a +15% boost in playoff scenarios.',
    image: '', status: 'Active', sortOrder: 2, circulation: '250 minted',
    redeemUrl: ''
  },
  {
    id: 'demo-3', cardId: 'AEOB-003', title: 'The Skyhook',
    subjectName: 'Atoy Co', team: 'Crispa Redmanizers', era: '1970s', position: 'SF',
    rarity: 'Rare', cardNumber: '3', cardTotal: '500', holographic: false,
    bio: 'Smooth jumper. Steady hand. One of the cornerstones of the Crispa dynasty.',
    reward: 'Early access to new episode drops',
    advantage: 'ACCESS', advantageDetail: 'Unlock new episodes 24 hours early',
    credits: 150, primaryColor: '#e8772b', secondaryColor: '#1a1f5e',
    stats: { offense: 82, defense: 74, handles: 78, shooting: 88, rebounding: 62, iq: 86 },
    specialAbility: 'Pure Stroke — shooting stat never dips below 80.',
    image: '', status: 'Active', sortOrder: 3, circulation: '500 minted',
    redeemUrl: ''
  },
  {
    id: 'demo-4', cardId: 'AEOB-004', title: 'Hometown Hero',
    subjectName: 'Mon Fernandez Jr.', team: 'Great Taste Coffee Makers', era: '1980s', position: 'PF',
    rarity: 'Common', cardNumber: '4', cardTotal: '1000', holographic: false,
    bio: 'Role player energy. Defensive glue. Every dynasty needs one.',
    reward: '50 AEOB credits',
    advantage: 'BONUS', advantageDetail: '+50 credits on redemption',
    credits: 50, primaryColor: '#64748b', secondaryColor: '#1a1f5e',
    stats: { offense: 60, defense: 78, handles: 55, shooting: 62, rebounding: 72, iq: 75 },
    specialAbility: 'Workhorse — energy never drops.',
    image: '', status: 'Active', sortOrder: 4, circulation: '1000 minted',
    redeemUrl: ''
  }
];

/* ------- State ------- */
let ALL_CARDS = [];
let filterRarity = 'all';
let filterAdvantage = 'all';
let searchTerm = '';

/* ------- Helpers ------- */
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeRarity(r) {
  const v = String(r || '').trim().toLowerCase();
  if (v === 'legendary') return 'Legendary';
  if (v === 'epic') return 'Epic';
  if (v === 'rare') return 'Rare';
  return 'Common';
}

function initialsOf(name) {
  return String(name || 'AE')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'AE';
}

/* ------- Rendering ------- */
function cardThumbHtml(card) {
  const rarity = normalizeRarity(card.rarity);
  const classes = ['trading-card', rarity.toLowerCase()];
  if (card.holographic) classes.push('holographic');

  const imgHtml = card.image
    ? `<img class="card-image" src="${escapeHtml(card.image)}" alt="${escapeHtml(card.subjectName || card.title)}" loading="lazy">`
    : `<div class="card-image-placeholder">${escapeHtml(initialsOf(card.subjectName || card.title))}</div>`;

  const numberText = card.cardNumber
    ? `#${escapeHtml(card.cardNumber)}${card.cardTotal ? '/' + escapeHtml(card.cardTotal) : ''}`
    : '';

  const advBadge = card.advantage
    ? `<span class="card-adv-badge">${escapeHtml(card.advantage)}</span>`
    : '';

  return `
    <div class="${classes.join(' ')}" data-card-id="${escapeHtml(card.id)}" role="button" tabindex="0" aria-label="${escapeHtml(card.subjectName || card.title)}">
      ${imgHtml}
      <div class="card-top-strip">
        <span class="card-rarity-pill">${rarity}</span>
        ${numberText ? `<span class="card-number">${numberText}</span>` : ''}
      </div>
      <div class="card-bottom-panel">
        <div class="card-subject">${escapeHtml(card.subjectName || 'Untitled')}</div>
        ${card.title ? `<div class="card-title">${escapeHtml(card.title)}</div>` : ''}
        <div class="card-foot-row">
          <span class="team">${escapeHtml(card.team || card.era || '')}</span>
          ${advBadge}
        </div>
      </div>
    </div>
  `;
}

function filteredCards() {
  const q = searchTerm.trim().toLowerCase();
  return ALL_CARDS.filter(c => {
    if (filterRarity !== 'all' && normalizeRarity(c.rarity) !== filterRarity) return false;
    if (filterAdvantage !== 'all' && String(c.advantage || '').toUpperCase() !== filterAdvantage) return false;
    if (q) {
      const hay = [
        c.subjectName, c.title, c.team, c.era, c.position,
        c.bio, c.specialAbility, c.reward, c.advantageDetail
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderGrid() {
  const grid = document.getElementById('cardsGrid');
  const empty = document.getElementById('cardsEmpty');
  const meta = document.getElementById('resultsMeta');
  if (!grid) return;

  const items = filteredCards();

  if (meta) {
    meta.textContent = ALL_CARDS.length
      ? `Showing ${items.length} of ${ALL_CARDS.length} card${ALL_CARDS.length === 1 ? '' : 's'}`
      : 'No cards available yet.';
  }

  if (!items.length) {
    grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  grid.style.display = '';
  if (empty) empty.style.display = 'none';
  grid.innerHTML = items.map(cardThumbHtml).join('');

  // Wire clicks
  grid.querySelectorAll('.trading-card').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.cardId));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail(el.dataset.cardId);
      }
    });
  });
}

function updateHeroStats() {
  const total = ALL_CARDS.length;
  const legendary = ALL_CARDS.filter(c => normalizeRarity(c.rarity) === 'Legendary').length;
  const totalEl = document.getElementById('heroStatTotal');
  const legEl = document.getElementById('heroStatLegendary');
  if (totalEl) totalEl.textContent = total;
  if (legEl) legEl.textContent = legendary;

  // Rarity rail counts
  ['Common', 'Rare', 'Epic', 'Legendary'].forEach(r => {
    const count = ALL_CARDS.filter(c => normalizeRarity(c.rarity) === r).length;
    document.querySelectorAll(`[data-rarity-count="${r}"]`).forEach(el => {
      el.textContent = `${count} card${count === 1 ? '' : 's'}`;
    });
  });
}

/* ------- Filters ------- */
function wireFilters() {
  document.querySelectorAll('[data-rarity-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rarity-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterRarity = btn.dataset.rarityFilter;
      renderGrid();
    });
  });

  document.querySelectorAll('[data-adv-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-adv-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterAdvantage = btn.dataset.advFilter;
      renderGrid();
    });
  });

  const search = document.getElementById('cardsSearch');
  if (search) {
    let debounce;
    search.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchTerm = e.target.value || '';
        renderGrid();
      }, 180);
    });
  }

  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    filterRarity = 'all';
    filterAdvantage = 'all';
    searchTerm = '';
    document.querySelectorAll('[data-rarity-filter]').forEach(b => {
      b.classList.toggle('active', b.dataset.rarityFilter === 'all');
    });
    document.querySelectorAll('[data-adv-filter]').forEach(b => {
      b.classList.toggle('active', b.dataset.advFilter === 'all');
    });
    const search = document.getElementById('cardsSearch');
    if (search) search.value = '';
    renderGrid();
  });
}

/* ------- Detail modal ------- */
function statCellHtml(label, value) {
  const v = Number(value) || 0;
  const cls = v === 0 ? 'stat-cell zero' : 'stat-cell';
  return `<div class="${cls}"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${v}</div></div>`;
}

function detailBodyHtml(card) {
  const rarity = normalizeRarity(card.rarity);
  const subjectLine = [card.team, card.era, card.position].filter(Boolean).map(escapeHtml).join(' &middot; ');

  const pills = [`<span class="detail-pill rarity-${rarity.toLowerCase()}">${rarity}</span>`];
  if (card.advantage) pills.push(`<span class="detail-pill advantage">${escapeHtml(card.advantage)}</span>`);
  if (card.era) pills.push(`<span class="detail-pill era">${escapeHtml(card.era)}</span>`);
  if (card.team) pills.push(`<span class="detail-pill team">${escapeHtml(card.team)}</span>`);
  if (card.position) pills.push(`<span class="detail-pill position">${escapeHtml(card.position)}</span>`);

  const s = card.stats || {};
  const hasStats = ['offense','defense','handles','shooting','rebounding','iq']
    .some(k => Number(s[k]) > 0);

  const statsSection = hasStats ? `
    <div class="detail-section-title">Skill Ratings</div>
    <div class="stats-grid">
      ${statCellHtml('OFF', s.offense)}
      ${statCellHtml('DEF', s.defense)}
      ${statCellHtml('HND', s.handles)}
      ${statCellHtml('SHT', s.shooting)}
      ${statCellHtml('REB', s.rebounding)}
      ${statCellHtml('IQ',  s.iq)}
    </div>
  ` : '';

  const rewardBlock = (card.reward || card.advantageDetail || card.bonusPerk) ? `
    <div class="reward-box">
      <div class="reward-head">
        <div class="reward-icon">&#127873;</div>
        <div class="reward-title">Card Advantage</div>
      </div>
      <div class="reward-desc">
        ${escapeHtml(card.advantageDetail || card.reward || '')}
        ${card.bonusPerk ? `<div style="margin-top:8px;font-size:0.88rem;color:var(--text-secondary);"><strong>Bonus perk:</strong> ${escapeHtml(card.bonusPerk)}</div>` : ''}
      </div>
      ${Number(card.credits) > 0 ? `<div style="margin-top:10px;"><span class="credits-chip">&#9889; ${Number(card.credits).toLocaleString()} AEOB credits</span></div>` : ''}
    </div>
  ` : '';

  const abilityBlock = card.specialAbility ? `
    <div class="detail-section-title">Special Ability</div>
    <div class="detail-bio" style="font-style:italic;">&ldquo;${escapeHtml(card.specialAbility)}&rdquo;</div>
  ` : '';

  const circBlock = card.circulation ? `
    <div class="detail-section-title">Circulation</div>
    <div class="detail-bio">${escapeHtml(card.circulation)}</div>
  ` : '';

  const redeemBtn = card.redeemUrl ? `
    <a href="${escapeHtml(card.redeemUrl)}" target="_blank" rel="noopener" class="btn btn-primary" style="margin-top:8px;">Redeem this card</a>
  ` : '';

  return `
    <h2 id="detailTitle">${escapeHtml(card.subjectName || card.title || 'Card')}</h2>
    <div class="detail-subject-line">${subjectLine || (card.title ? escapeHtml(card.title) : '')}</div>
    <div class="detail-rarity-row">${pills.join('')}</div>

    ${card.bio ? `<p class="detail-bio">${escapeHtml(card.bio)}</p>` : ''}

    ${statsSection}
    ${abilityBlock}
    ${rewardBlock}
    ${circBlock}
    ${redeemBtn}
  `;
}

function openDetail(cardId) {
  const card = ALL_CARDS.find(c => String(c.id) === String(cardId));
  if (!card) return;
  const modal = document.getElementById('cardDetailModal');
  const preview = document.getElementById('detailCardPreview');
  const body = document.getElementById('detailBody');
  if (!modal || !preview || !body) return;

  preview.innerHTML = cardThumbHtml(card);
  body.innerHTML = detailBodyHtml(card);
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  const modal = document.getElementById('cardDetailModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function wireModal() {
  document.getElementById('cardDetailClose')?.addEventListener('click', closeDetail);
  document.getElementById('cardDetailModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cardDetailModal') closeDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
  });
}

/* ------- Fetch ------- */
async function fetchCards() {
  try {
    const res = await fetch('/.netlify/functions/cards-list');
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data.cards) ? data.cards : [];
    return list.length ? list : null;
  } catch (e) {
    console.error('cards fetch failed:', e);
    return null;
  }
}

/* ------- Init ------- */
async function init() {
  wireFilters();
  wireModal();

  const live = await fetchCards();
  ALL_CARDS = live || FALLBACK_CARDS.slice();

  updateHeroStats();
  renderGrid();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging / extensions
window.AEOBCards = {
  get all() { return ALL_CARDS; },
  openDetail,
  closeDetail,
  refresh: init
};
