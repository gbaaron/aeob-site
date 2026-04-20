/* AEOB — Authed User's Card Collection
   GET /.netlify/functions/cards-my-collection
   Returns the user's owned cards joined with full card data + their
   current credit balance. */

const Airtable = require('airtable');
const { requireUser, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const USERS_TABLE = 'Users';
const CARDS_TABLE = 'Cards';

/* ---------- Shared card mapping ---------- */
function pick(f, names, fallback) {
  for (const n of names) if (f[n] !== undefined && f[n] !== null && f[n] !== '') return f[n];
  return fallback;
}
function firstUrl(field) {
  if (!field) return '';
  if (Array.isArray(field) && field[0]) return field[0].url || field[0].thumbnails?.large?.url || '';
  if (typeof field === 'string') return field;
  return '';
}
function mapCard(r) {
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
    image
  };
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
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' });

  const authed = requireUser(event);
  if (!authed.ok) return authed.response;
  const tokenUser = authed.user;

  if (!process.env.AIRTABLE_API_KEY) {
    return jsonResponse(200, { owned: [], balance: 0, tier: 'Rookie' });
  }

  try {
    const userRecord = await base(USERS_TABLE).find(tokenUser.userId);
    const balance = Number(userRecord.fields.Points || 0);
    const tier = userRecord.fields.Tier || 'Rookie';
    const owned = parseOwned(userRecord.fields.OwnedCards);

    if (!owned.length) {
      return jsonResponse(200, { owned: [], balance, tier });
    }

    // Resolve the unique card IDs this user owns and fetch full card data.
    const uniqueCardIds = [...new Set(owned.map(o => o.cardId).filter(Boolean))];
    const cardLookup = {};
    if (uniqueCardIds.length) {
      const allRecords = await base(CARDS_TABLE).select({ pageSize: 100 }).all();
      allRecords.forEach(r => {
        if (uniqueCardIds.includes(r.id)) {
          cardLookup[r.id] = mapCard(r);
        }
      });
    }

    // Hydrate each ownership row with its card data (keeps duplicates / pack info).
    const hydrated = owned
      .map(o => {
        const card = cardLookup[o.cardId];
        if (!card) return null;
        return {
          instanceId: o.instanceId,
          acquiredAt: o.acquiredAt,
          pack: o.pack,
          card
        };
      })
      .filter(Boolean);

    return jsonResponse(200, { owned: hydrated, balance, tier });
  } catch (err) {
    console.error('cards-my-collection error:', err);
    return jsonResponse(500, { error: 'Failed to load collection' });
  }
};
