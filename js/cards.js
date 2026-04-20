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
let OWNED_CARDS = [];      // hydrated ownership rows from /cards-my-collection
let USER_BALANCE = 0;
let USER_TIER = 'Rookie';
let CURRENT_VIEW = 'gallery';  // 'gallery' | 'owned'
let filterRarity = 'all';
let filterAdvantage = 'all';
let searchTerm = '';

/* ------- Pack catalog (must mirror cards-pack-buy.js) ------- */
const PACKS = [
  {
    id: 'rookie', name: 'Rookie Pack', price: 50, cards: 3, guaranteed: 'Rare',
    icon: '\u{1F3C0}', color1: '#8b92a0', color2: '#5e636e',
    tagline: 'Starter pull. 3 cards, at least one Rare.'
  },
  {
    id: 'veteran', name: 'Veteran Pack', price: 150, cards: 5, guaranteed: 'Epic',
    icon: '\u{1F525}', color1: '#1a1f5e', color2: '#3a3f8e',
    tagline: '5 cards — an Epic guaranteed in every box.'
  },
  {
    id: 'all-star', name: 'All-Star Pack', price: 400, cards: 7, guaranteed: 'Legendary',
    icon: '\u2B50', color1: '#cc2030', color2: '#e8772b',
    tagline: '7 cards. A Legendary is locked in.'
  },
  {
    id: 'legendary', name: 'Legendary Box', price: 1000, cards: 10, guaranteed: 'Legendary',
    icon: '\u{1F451}', color1: '#e8772b', color2: '#ffd700',
    tagline: '10 cards. Two guaranteed Legendaries.',
    isLegendary: true
  }
];

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

/* ------- Auth helper ------- */
function getToken() {
  return localStorage.getItem('aeob-token') || localStorage.getItem('aeob_token') || '';
}
function isSignedIn() { return !!getToken(); }

/* ------- Collection fetch ------- */
async function fetchCollection() {
  if (!isSignedIn()) return null;
  try {
    const res = await fetch('/.netlify/functions/cards-my-collection', {
      headers: { Authorization: 'Bearer ' + getToken() }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('collection fetch failed:', e);
    return null;
  }
}

async function refreshCollection() {
  const data = await fetchCollection();
  if (!data) {
    OWNED_CARDS = [];
    USER_BALANCE = 0;
    return;
  }
  OWNED_CARDS = Array.isArray(data.owned) ? data.owned : [];
  USER_BALANCE = Number(data.balance || 0);
  USER_TIER = data.tier || 'Rookie';
  updateBalanceChip();
  updateOwnedBadge();
  updatePackButtons();
}

function updateBalanceChip() {
  const chip = document.getElementById('packBalanceChip');
  const amt = document.getElementById('packBalanceAmount');
  const msg = document.getElementById('packSignedOutMsg');
  if (isSignedIn()) {
    if (chip) chip.style.display = '';
    if (amt) amt.textContent = USER_BALANCE.toLocaleString();
    if (msg) msg.style.display = 'none';
  } else {
    if (chip) chip.style.display = 'none';
    if (msg) msg.style.display = 'block';
  }
}

function updateOwnedBadge() {
  const badge = document.getElementById('ownedCountBadge');
  if (badge) badge.textContent = OWNED_CARDS.length;
}

function updatePackButtons() {
  document.querySelectorAll('.pack-buy-btn').forEach(btn => {
    const price = Number(btn.dataset.price || 0);
    const signedIn = isSignedIn();
    if (!signedIn) {
      btn.textContent = 'Sign In to Buy';
      btn.disabled = false;
    } else if (USER_BALANCE < price) {
      btn.textContent = 'Not Enough Credits';
      btn.disabled = true;
    } else {
      btn.textContent = 'Open Pack';
      btn.disabled = false;
    }
  });
}

/* ------- Pack store rendering ------- */
function renderPackStore() {
  const grid = document.getElementById('packGrid');
  if (!grid) return;
  grid.innerHTML = PACKS.map(p => `
    <div class="pack-card${p.isLegendary ? ' legendary-pack' : ''}" style="--pack-c1:${p.color1};--pack-c2:${p.color2};">
      <div class="pack-icon">${p.icon}</div>
      <div class="pack-name">${escapeHtml(p.name)}</div>
      <div class="pack-tagline">${escapeHtml(p.tagline)}</div>
      <div class="pack-meta">
        <span><strong>${p.cards}</strong> cards</span>
        <span>+<strong>${p.guaranteed}</strong></span>
      </div>
      <div class="pack-price">${p.price}<span class="currency">credits</span></div>
      <button class="pack-buy-btn" data-pack="${p.id}" data-price="${p.price}">Open Pack</button>
    </div>
  `).join('');

  grid.querySelectorAll('.pack-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => handleBuyPack(btn.dataset.pack));
  });

  updatePackButtons();
}

async function handleBuyPack(packId) {
  if (!isSignedIn()) {
    if (window.showAuthModal) window.showAuthModal();
    else if (document.getElementById('loginBtn')) document.getElementById('loginBtn').click();
    return;
  }
  const pack = PACKS.find(p => p.id === packId);
  if (!pack) return;
  if (USER_BALANCE < pack.price) {
    showInsufficientModal(pack);
    return;
  }

  const btn = document.querySelector(`.pack-buy-btn[data-pack="${packId}"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Opening...'; }

  try {
    const res = await fetch('/.netlify/functions/cards-pack-buy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken()
      },
      body: JSON.stringify({ packId })
    });
    const data = await res.json();
    if (!res.ok) {
      if (window.showToast) window.showToast(data.error || 'Pack purchase failed', 'error');
      else alert(data.error || 'Pack purchase failed');
      updatePackButtons();
      return;
    }
    USER_BALANCE = Number(data.newBalance || 0);
    USER_TIER = data.newTier || USER_TIER;
    updateBalanceChip();
    await startPackOpening(pack, data.cards || []);
    await refreshCollection();
  } catch (e) {
    console.error('buy pack failed:', e);
    if (window.showToast) window.showToast('Pack purchase failed', 'error');
    updatePackButtons();
  }
}

function showInsufficientModal(pack) {
  const modal = document.getElementById('packOpeningModal');
  const stage = document.getElementById('packOpeningStage');
  if (!modal || !stage) return;
  stage.innerHTML = `
    <div class="pack-insufficient-modal">
      <h3>Not Enough Credits</h3>
      <p>The ${escapeHtml(pack.name)} costs <strong>${pack.price}</strong> credits, but you only have <strong>${USER_BALANCE}</strong>.</p>
      <p style="font-size:0.88rem;">Earn more by watching live, making predictions, and crushing trivia.</p>
      <a href="/rewards.html" class="btn btn-primary">See Ways to Earn</a>
      <button class="btn" style="margin-left:10px;background:rgba(255,255,255,0.1);color:#fff;" onclick="window.AEOBCards.closePackOpening()">Close</button>
    </div>
  `;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

/* ------- Pack opening animation ------- */
async function startPackOpening(pack, pulledCards) {
  const modal = document.getElementById('packOpeningModal');
  const stage = document.getElementById('packOpeningStage');
  if (!modal || !stage) return;

  // Stage 1: 3D pack spin
  stage.innerHTML = `
    <div class="pack-3d-wrap" style="--pack-c1:${pack.color1};--pack-c2:${pack.color2};">
      <div class="pack-3d">
        <div class="pack-3d-face front">
          <div class="big-icon">${pack.icon}</div>
          <div class="name">${escapeHtml(pack.name)}</div>
        </div>
        <div class="pack-3d-face back">
          <div class="big-icon">${pack.icon}</div>
          <div class="name">AEOB</div>
        </div>
      </div>
    </div>
    <div class="pack-opening-status">Opening ${escapeHtml(pack.name)}...</div>
  `;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Wait for spin animation
  await wait(1800);

  // Rip particles
  triggerRipBurst(pack);
  await wait(600);

  // Stage 2: revealed cards (face down)
  const hasLegendary = pulledCards.some(c => normalizeRarity(c.rarity) === 'Legendary');
  stage.innerHTML = `
    <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:24px;">
      <div class="pack-opening-status">Tap cards to reveal</div>
      <div class="pack-reveal-grid" id="packRevealGrid">
        ${pulledCards.map((c, i) => `
          <div class="reveal-card" data-idx="${i}" style="animation-delay:${i * 70}ms;">
            <div class="reveal-card-inner">
              <div class="reveal-face back"></div>
              <div class="reveal-face front">${cardThumbHtml(c)}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="pack-opening-footer" style="position:static;">
        <button class="btn" id="revealAllBtn">Reveal All</button>
        <button class="btn" id="closePackBtn" style="margin-left:10px;background:rgba(255,255,255,0.1);color:#fff;">Done</button>
      </div>
    </div>
  `;

  // Wire reveal clicks
  const revealEls = Array.from(stage.querySelectorAll('.reveal-card'));
  revealEls.forEach(el => {
    el.addEventListener('click', () => flipReveal(el, pulledCards, hasLegendary), { once: true });
  });

  document.getElementById('revealAllBtn')?.addEventListener('click', () => {
    revealEls.forEach((el, i) => {
      if (!el.classList.contains('flipped')) {
        setTimeout(() => flipReveal(el, pulledCards, hasLegendary), i * 120);
      }
    });
  });
  document.getElementById('closePackBtn')?.addEventListener('click', closePackOpening);
}

function flipReveal(el, pulledCards, hasLegendary) {
  if (el.classList.contains('flipped')) return;
  const idx = Number(el.dataset.idx);
  const card = pulledCards[idx];
  const rarity = normalizeRarity(card?.rarity);
  if (rarity === 'Legendary') el.classList.add('legendary-shine');
  else if (rarity === 'Epic') el.classList.add('epic-shine');
  el.classList.add('flipped');

  if (rarity === 'Legendary') {
    triggerLegendaryExplosion();
  }
}

function triggerRipBurst(pack) {
  const stage = document.getElementById('packOpeningStage');
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'rip-particle';
    p.style.setProperty('--pack-c1', pack.color1);
    p.style.setProperty('--pack-c2', pack.color2);
    p.style.left = cx + 'px';
    p.style.top = cy + 'px';
    const angle = (i / 20) * Math.PI * 2;
    const dist = 120 + Math.random() * 80;
    p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    stage.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

function triggerLegendaryExplosion() {
  const flash = document.createElement('div');
  flash.className = 'legendary-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 1700);

  const colors = ['#ffd700', '#e8772b', '#cc2030', '#1a1f5e', '#fff'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-particle';
    c.style.background = colors[i % colors.length];
    const angle = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * 400;
    c.style.setProperty('--cx', Math.cos(angle) * dist + 'px');
    c.style.setProperty('--cy', (Math.sin(angle) * dist + 300) + 'px');
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1900);
  }
}

function closePackOpening() {
  const modal = document.getElementById('packOpeningModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  const stage = document.getElementById('packOpeningStage');
  if (stage) stage.innerHTML = '';

  // If user is viewing My Collection, refresh the grid
  if (CURRENT_VIEW === 'owned') renderGrid();
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ------- View toggle (Gallery vs My Collection) ------- */
function wireViewToggle() {
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      CURRENT_VIEW = btn.dataset.view;
      renderGrid();
    });
  });
}

/* Override filteredCards based on current view */
const _origFilteredCards = filteredCards;
filteredCards = function() {
  let source;
  if (CURRENT_VIEW === 'owned') {
    // Dedupe owned cards by card id, attach acquisition count
    const counts = {};
    OWNED_CARDS.forEach(o => {
      const cid = o.card.id;
      counts[cid] = (counts[cid] || 0) + 1;
    });
    const seen = new Set();
    source = OWNED_CARDS.filter(o => {
      if (seen.has(o.card.id)) return false;
      seen.add(o.card.id);
      return true;
    }).map(o => ({ ...o.card, _ownedCount: counts[o.card.id] }));
  } else {
    source = ALL_CARDS;
  }

  const q = searchTerm.trim().toLowerCase();
  return source.filter(c => {
    if (filterRarity !== 'all' && normalizeRarity(c.rarity) !== filterRarity) return false;
    if (filterAdvantage !== 'all' && String(c.advantage || '').toUpperCase() !== filterAdvantage) return false;
    if (q) {
      const hay = [c.subjectName, c.title, c.team, c.era, c.position, c.bio, c.specialAbility, c.reward, c.advantageDetail].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
};

/* Patch renderGrid meta for owned view + empty state */
const _origRenderGrid = renderGrid;
renderGrid = function() {
  const meta = document.getElementById('resultsMeta');
  const empty = document.getElementById('cardsEmpty');
  const grid = document.getElementById('cardsGrid');
  if (!grid) return;

  const items = filteredCards();

  if (meta) {
    if (CURRENT_VIEW === 'owned') {
      if (!isSignedIn()) {
        meta.textContent = 'Sign in to see your collection.';
      } else {
        const total = OWNED_CARDS.length;
        const unique = new Set(OWNED_CARDS.map(o => o.card.id)).size;
        meta.textContent = total
          ? `${unique} unique · ${total} total pull${total === 1 ? '' : 's'}`
          : 'No cards yet — open a pack above.';
      }
    } else {
      meta.textContent = ALL_CARDS.length
        ? `Showing ${items.length} of ${ALL_CARDS.length} card${ALL_CARDS.length === 1 ? '' : 's'}`
        : 'No cards available yet.';
    }
  }

  if (!items.length) {
    grid.style.display = 'none';
    if (empty) {
      empty.style.display = 'block';
      if (CURRENT_VIEW === 'owned') {
        const titleEl = empty.querySelector('h3');
        const pEl = empty.querySelector('p');
        if (!isSignedIn()) {
          if (titleEl) titleEl.textContent = 'Sign in to view your collection';
          if (pEl) pEl.textContent = 'Your pulled cards will live here.';
        } else if (OWNED_CARDS.length === 0) {
          if (titleEl) titleEl.textContent = 'No cards yet';
          if (pEl) pEl.textContent = 'Open a pack above to start your collection.';
        } else {
          if (titleEl) titleEl.textContent = 'No cards match those filters';
          if (pEl) pEl.textContent = 'Try resetting the filters or clearing your search.';
        }
      } else {
        const titleEl = empty.querySelector('h3');
        const pEl = empty.querySelector('p');
        if (titleEl) titleEl.textContent = 'No cards match those filters';
        if (pEl) pEl.textContent = 'Try resetting the filters or clearing your search.';
      }
    }
    return;
  }

  grid.style.display = '';
  if (empty) empty.style.display = 'none';
  grid.innerHTML = items.map(cardThumbHtml).join('');

  grid.querySelectorAll('.trading-card').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.cardId));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDetail(el.dataset.cardId);
      }
    });
  });
};

/* ------- Init ------- */
async function init() {
  wireFilters();
  wireModal();
  wireViewToggle();

  // Sign-in link in pack store signed-out message
  document.getElementById('packSignInLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.click();
  });

  // Close pack modal on backdrop click / escape
  document.getElementById('packOpeningModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'packOpeningModal') closePackOpening();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const m = document.getElementById('packOpeningModal');
      if (m && m.classList.contains('active')) closePackOpening();
    }
  });

  const live = await fetchCards();
  ALL_CARDS = live || FALLBACK_CARDS.slice();

  renderPackStore();
  updateBalanceChip();
  updateHeroStats();
  renderGrid();

  // Fetch collection in background if signed in
  if (isSignedIn()) refreshCollection();

  // React to auth state changes
  window.addEventListener('authStateChanged', () => {
    updateBalanceChip();
    updatePackButtons();
    if (isSignedIn()) refreshCollection();
    else { OWNED_CARDS = []; USER_BALANCE = 0; updateOwnedBadge(); renderGrid(); }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for debugging / extensions
window.AEOBCards = {
  get all() { return ALL_CARDS; },
  get owned() { return OWNED_CARDS; },
  get balance() { return USER_BALANCE; },
  openDetail,
  closeDetail,
  closePackOpening,
  buyPack: handleBuyPack,
  refresh: init,
  refreshCollection
};
