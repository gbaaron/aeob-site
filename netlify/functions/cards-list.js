/* AEOB — Public Digital Trading Cards Listing
   Reads active cards from the Airtable Cards table. Returns an array of
   normalized card objects safe to render on the public cards page. */

const Airtable = require('airtable');
const { handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);

const TABLE = 'Cards';

/* ------- field lookup helper (handles inconsistent field names) ------- */
function pick(f, names, fallback) {
  for (const n of names) {
    if (f[n] !== undefined && f[n] !== null && f[n] !== '') return f[n];
  }
  return fallback;
}

function firstUrl(field) {
  if (!field) return '';
  if (Array.isArray(field) && field[0]) {
    return field[0].url || field[0].thumbnails?.large?.url || '';
  }
  if (typeof field === 'string') return field;
  return '';
}

function mapRecord(r) {
  const f = r.fields || {};

  const rarityRaw = String(pick(f, ['Rarity', 'rarity'], 'Common')).trim();
  // Normalize to title case
  const rarity = (['Common', 'Rare', 'Epic', 'Legendary'].find(
    x => x.toLowerCase() === rarityRaw.toLowerCase()
  )) || 'Common';

  const advantage = String(pick(f, ['AdvantageType', 'Advantage', 'advantage_type'], '')).toUpperCase();
  const allowedAdvantages = ['DISCOUNT', 'MERCH', 'ACCESS', 'ENTRY', 'VOTE', 'BONUS'];
  const normalizedAdv = allowedAdvantages.includes(advantage) ? advantage : '';

  const image =
    firstUrl(f.Image) ||
    firstUrl(f.CardImage) ||
    firstUrl(f.Photo) ||
    firstUrl(f.image) ||
    pick(f, ['ImageURL', 'CardImageURL', 'PhotoURL'], '');

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
    bio: pick(f, ['Bio', 'Description', 'Writeup'], ''),
    reward: pick(f, ['Reward', 'RewardDescription', 'reward_description'], ''),
    bonusPerk: pick(f, ['BonusPerk', 'bonus_perk'], ''),
    advantage: normalizedAdv,
    advantageDetail: pick(f, ['AdvantageDetail', 'AdvantageDescription'], ''),
    credits: Number(pick(f, ['Credits', 'aeob_credits', 'credits'], 0)) || 0,
    primaryColor: pick(f, ['PrimaryColor', 'primary_color'], '#1a1f5e'),
    secondaryColor: pick(f, ['SecondaryColor', 'secondary_color'], '#cc2030'),
    stats: {
      offense: Number(pick(f, ['Offense', 'offense', 'OFF'], 0)) || 0,
      defense: Number(pick(f, ['Defense', 'defense', 'DEF'], 0)) || 0,
      handles: Number(pick(f, ['Handles', 'handles', 'HND'], 0)) || 0,
      shooting: Number(pick(f, ['Shooting', 'shooting', 'SHT'], 0)) || 0,
      rebounding: Number(pick(f, ['Rebounding', 'rebounding', 'REB'], 0)) || 0,
      iq: Number(pick(f, ['IQ', 'iq', 'BasketballIQ'], 0)) || 0
    },
    specialAbility: pick(f, ['SpecialAbility', 'special_ability'], ''),
    image,
    status: pick(f, ['Status', 'status'], 'Active'),
    sortOrder: Number(pick(f, ['SortOrder', 'sort_order'], 0)) || 0,
    circulation: pick(f, ['Circulation', 'circulation'], ''),
    redeemUrl: pick(f, ['RedeemURL', 'redeem_url'], '')
  };
}

exports.handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  try {
    const records = await base(TABLE).select({
      pageSize: 100
    }).all();

    const cards = records
      .map(mapRecord)
      .filter(c => {
        const s = String(c.status || '').toLowerCase();
        return s !== 'draft' && s !== 'archived' && s !== 'hidden';
      })
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        // Secondary: rarity order Legendary > Epic > Rare > Common
        const rank = { Legendary: 0, Epic: 1, Rare: 2, Common: 3 };
        return (rank[a.rarity] ?? 4) - (rank[b.rarity] ?? 4);
      });

    return jsonResponse(200, { cards });
  } catch (err) {
    console.error('cards-list error:', err);
    // Graceful fallback: empty list so the page still renders
    return jsonResponse(200, { cards: [], error: 'Failed to fetch cards' });
  }
};
