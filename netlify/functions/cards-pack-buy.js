/* AEOB — Buy a Card Pack
   POST /.netlify/functions/cards-pack-buy
   Body: { packId: 'rookie' | 'veteran' | 'all-star' | 'legendary' }

   Deducts credits from the user's Points balance, rolls cards using
   rarity weights (with a guaranteed-rarity first card per pack), and
   appends the pulls to Users.OwnedCards (JSON array of { cardId,
   acquiredAt, pack, rarity, instanceId }).

   Depends on an OwnedCards long-text field on the Users table. If the
   field does not exist the write will throw and the function returns
   500 so the admin can add it. */

const Airtable = require('airtable');
const { requireUser, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const USERS_TABLE = 'Users';
const CARDS_TABLE = 'Cards';
const REWARDS_TABLE = 'RewardsLog';

/* ---------- Pack catalog (source of truth) ---------- */
const PACKS = {
  'rookie':    { name: 'Rookie Pack',    price: 50,   cards: 3,  guaranteed: 'Rare',      icon: '🏀', color1: '#8b92a0', color2: '#5e636e' },
  'veteran':   { name: 'Veteran Pack',   price: 150,  cards: 5,  guaranteed: 'Epic',      icon: '🔥', color1: '#1a1f5e', color2: '#3a3f8e' },
  'all-star':  { name: 'All-Star Pack',  price: 400,  cards: 7,  guaranteed: 'Legendary', icon: '⭐', color1: '#cc2030', color2: '#e8772b' },
  'legendary': { name: 'Legendary Box',  price: 1000, cards: 10, guaranteed: 'Legendary', icon: '👑', color1: '#e8772b', color2: '#ffd700', legendaryBonus: 1 }
};

const RARITY_WEIGHTS = {
  'Common':    65,
  'Rare':      26,
  'Epic':       8,
  'Legendary':  1
};

const TIERS = [
  { name: 'Rookie',   min: 0 },
  { name: 'Veteran',  min: 250 },
  { name: 'All-Star', min: 750 },
  { name: 'Legend',   min: 1500 }
];

function tierFor(points) {
  let tier = 'Rookie';
  for (const t of TIERS) if (points >= t.min) tier = t.name;
  return tier;
}

/* ---------- Card shape helpers (mirror cards-list.js) ---------- */
function pick(f, names, fallback) {
  for (const n of names) {
    if (f[n] !== undefined && f[n] !== null && f[n] !== '') return f[n];
  }
  return fallback;
}
function firstUrl(field) {
  if (!field) return '';
  if (Array.isArray(field) && field[0]) return field[0].url || field[0].thumbnails?.large?.url || '';
  if (typeof field === 'string') return field;
  return '';
}
function mapCardRecord(r) {
  const f = r.fields || {};
  const rarityRaw = String(pick(f, ['Rarity', 'rarity'], 'Common')).trim();
  const rarity = (['Common', 'Rare', 'Epic', 'Legendary'].find(x => x.toLowerCase() === rarityRaw.toLowerCase())) || 'Common';
  const advantage = String(pick(f, ['AdvantageType', 'Advantage', 'advantage_type'], '')).toUpperCase();
  const allowed = ['DISCOUNT', 'MERCH', 'ACCESS', 'ENTRY', 'VOTE', 'BONUS'];
  const image = firstUrl(f.Image) || firstUrl(f.CardImage) || firstUrl(f.Photo) || firstUrl(f.image) || pick(f, ['ImageURL', 'CardImageURL', 'PhotoURL'], '');
  return {
    id: r.id,
    cardId: pick(f, ['CardID', 'card_id', 'CardNumber', 'card_number'], r.id),
    title: pick(f, ['Title', 'CardTitle', 'Name'], 'Untitled Card'),
    subjectName: pick(f, ['SubjectName', 'PlayerName', 'Subject', 'Player'], ''),
    team: pick(f, ['Team', 'team'], ''),
    era: pick(f, ['Era', 'era'], ''),
    position: pick(f, ['Position', 'position'], ''),
    rarity,
    cardNumber: pick(f, ['CardNumber', 'card_number', 'Number'], ''),
    cardTotal: pick(f, ['CardTotal', 'card_total', 'Total'], ''),
    holographic: !!pick(f, ['Holographic', 'holographic'], false),
    advantage: allowed.includes(advantage) ? advantage : '',
    credits: Number(pick(f, ['Credits', 'aeob_credits', 'credits'], 0)) || 0,
    image,
    status: pick(f, ['Status', 'status'], 'Active')
  };
}

/* ---------- Rarity-weighted roll ---------- */
function pullCard(cardsByRarity, guaranteedRarity) {
  if (guaranteedRarity && cardsByRarity[guaranteedRarity] && cardsByRarity[guaranteedRarity].length) {
    const pool = cardsByRarity[guaranteedRarity];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const roll = Math.random() * 100;
  let c = 0;
  for (const r of ['Legendary', 'Epic', 'Rare', 'Common']) {
    c += RARITY_WEIGHTS[r];
    if (roll < c && cardsByRarity[r] && cardsByRarity[r].length) {
      return cardsByRarity[r][Math.floor(Math.random() * cardsByRarity[r].length)];
    }
  }
  // Fallback: any card
  const all = [].concat(...Object.values(cardsByRarity));
  return all[Math.floor(Math.random() * all.length)];
}

function instanceId() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function parseOwned(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

exports.handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const authed = requireUser(event);
  if (!authed.ok) return authed.response;
  const tokenUser = authed.user;

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const packId = String(body.packId || '').toLowerCase();
  const pack = PACKS[packId];
  if (!pack) return jsonResponse(400, { error: 'Unknown pack' });

  if (!process.env.AIRTABLE_API_KEY) {
    return jsonResponse(500, { error: 'Server not configured' });
  }

  try {
    /* 1. Load user, check balance */
    const userRecord = await base(USERS_TABLE).find(tokenUser.userId);
    const currentPoints = Number(userRecord.fields.Points || 0);

    if (currentPoints < pack.price) {
      return jsonResponse(402, {
        error: 'Not enough credits',
        need: pack.price,
        have: currentPoints
      });
    }

    /* 2. Load active cards, bucket by rarity */
    const allCardRecords = await base(CARDS_TABLE).select({ pageSize: 100 }).all();
    const mapped = allCardRecords
      .map(mapCardRecord)
      .filter(c => {
        const s = String(c.status || '').toLowerCase();
        return s !== 'draft' && s !== 'archived' && s !== 'hidden';
      });

    const cardsByRarity = { 'Common': [], 'Rare': [], 'Epic': [], 'Legendary': [] };
    mapped.forEach(c => { if (cardsByRarity[c.rarity]) cardsByRarity[c.rarity].push(c); });

    // If the store is empty (no Active cards in Airtable), refuse gracefully
    const totalPool = mapped.length;
    if (totalPool === 0) {
      return jsonResponse(503, { error: 'No cards available. Try again later.' });
    }

    /* 3. Roll cards */
    const pulled = [];
    const guaranteedCount = 1 + (pack.legendaryBonus || 0);
    for (let i = 0; i < guaranteedCount; i++) {
      const c = pullCard(cardsByRarity, pack.guaranteed);
      if (c) pulled.push(c);
    }
    for (let i = pulled.length; i < pack.cards; i++) {
      const c = pullCard(cardsByRarity, null);
      if (c) pulled.push(c);
    }

    /* 4. Append to OwnedCards on Users row */
    const existingOwned = parseOwned(userRecord.fields.OwnedCards);
    const now = new Date().toISOString();
    const newlyOwned = pulled.map(c => ({
      cardId: c.id,
      acquiredAt: now,
      pack: pack.name,
      rarity: c.rarity,
      instanceId: instanceId()
    }));
    const nextOwned = existingOwned.concat(newlyOwned);

    const newTotal = currentPoints - pack.price;
    const newTier = tierFor(newTotal);

    await base(USERS_TABLE).update(tokenUser.userId, {
      Points: newTotal,
      Tier: newTier,
      OwnedCards: JSON.stringify(nextOwned).slice(0, 99000) // Airtable long-text soft cap
    });

    /* 5. Log the transaction (best-effort — don't block response) */
    try {
      await base(REWARDS_TABLE).create({
        UserId: tokenUser.userId,
        Action: `Bought ${pack.name}`,
        Points: -pack.price,
        CreatedAt: now
      });
    } catch (logErr) {
      console.warn('RewardsLog write failed (non-fatal):', logErr.message);
    }

    /* 6. Return pulled cards + new balance */
    return jsonResponse(200, {
      success: true,
      pack: { id: packId, name: pack.name, price: pack.price, icon: pack.icon, color1: pack.color1, color2: pack.color2 },
      cards: pulled,
      newBalance: newTotal,
      newTier
    });
  } catch (err) {
    console.error('cards-pack-buy error:', err);
    const message = err && err.message ? err.message : 'Failed to open pack';
    // Hint for the most likely misconfiguration
    const hint = /Unknown field|OwnedCards/i.test(message)
      ? ' Ensure the Users table has a long-text field named OwnedCards.'
      : '';
    return jsonResponse(500, { error: message + hint });
  }
};
