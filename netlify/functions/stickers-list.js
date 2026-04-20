/* AEOB — Sticker Catalog (public read)
   Returns active stickers users can send on the livestream.
   Edge-cached for 60s since catalog rarely changes. */

const Airtable = require('airtable');
const { handleOptions, jsonHeaders, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const STICKERS_TABLE = 'LiveStickers';

// Graceful-degradation demo catalog used when Airtable isn't configured
// or the table is empty. Same shape the frontend expects.
// Paid stickers are open to EVERYONE — anyone with enough credits can send them.
// (Tier gates live on the separate /free emoji reactions feature.)
const DEMO_STICKERS = [
  { id: 'demo-three',      name: 'Three!',          emoji: '\uD83C\uDFAF',                   cost: 10,   animation: 'float',    description: 'Nothing but net.', sortOrder: 1 },
  { id: 'demo-clap',       name: 'Clap Pack',       emoji: '\uD83D\uDC4F',                   cost: 15,   animation: 'float',    description: 'Show the love.', sortOrder: 2 },
  { id: 'demo-rain',       name: 'Basketball Rain', emoji: '\uD83C\uDFC0',                   cost: 25,   animation: 'rain',     description: 'It\u2019s raining hoops.', sortOrder: 3 },
  { id: 'demo-crossover',  name: 'Crossover',       emoji: '\uD83D\uDCAB',                   cost: 50,   animation: 'burst',    description: 'Broke his ankles.', sortOrder: 4 },
  { id: 'demo-fave',       name: 'Fan Favorite',    emoji: '\u2764\uFE0F\u200D\uD83D\uDD25', cost: 75,   animation: 'burst',    description: 'Instant classic.', sortOrder: 5 },
  { id: 'demo-dunk',       name: 'Slam Dunk',       emoji: '\uD83D\uDCA5',                   cost: 150,  animation: 'burst',    description: 'Poster-worthy jam.', sortOrder: 6 },
  { id: 'demo-buzzer',     name: 'Buzzer Beater',   emoji: '\u23F0',                         cost: 300,  animation: 'takeover', description: 'Game-winner territory.', sortOrder: 7 },
  { id: 'demo-champ',      name: 'Championship',    emoji: '\uD83C\uDFC6',                   cost: 500,  animation: 'takeover', description: 'Parade route vibes.', sortOrder: 8 },
  { id: 'demo-mvp',        name: 'MVP Chant',       emoji: '\uD83D\uDC51',                   cost: 1000, animation: 'takeover', description: 'M-V-P! M-V-P!', sortOrder: 9 },
  { id: 'demo-goat',       name: 'GOAT Mode',       emoji: '\uD83D\uDC10',                   cost: 2500, animation: 'takeover', description: 'Peak icon status.', sortOrder: 10 }
];

exports.handler = async (event) => {
  const preflight = handleOptions(event);
  if (preflight) return preflight;

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const cacheHeaders = {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
  };

  try {
    if (!process.env.AIRTABLE_API_KEY) {
      return {
        statusCode: 200,
        headers: jsonHeaders(cacheHeaders),
        body: JSON.stringify({ stickers: DEMO_STICKERS, demoMode: true })
      };
    }

    const recs = await base(STICKERS_TABLE).select({
      filterByFormula: `{IsActive} = TRUE()`,
      sort: [{ field: 'SortOrder', direction: 'asc' }]
    }).all().catch(() => []);

    let stickers = recs.map(r => ({
      id: r.id,
      name: r.fields.Name || 'Sticker',
      emoji: r.fields.Emoji || '\uD83C\uDFC0',
      imageUrl: r.fields.ImageUrl || '',
      cost: Number(r.fields.Cost) || 0,
      animation: (r.fields.AnimationType || 'float').toLowerCase(),
      description: r.fields.Description || '',
      sortOrder: Number(r.fields.SortOrder) || 0
    }));

    // If the table exists but has nothing yet, return demo so the UI isn't blank
    if (stickers.length === 0) stickers = DEMO_STICKERS;

    return {
      statusCode: 200,
      headers: jsonHeaders(cacheHeaders),
      body: JSON.stringify({ stickers })
    };
  } catch (err) {
    console.error('stickers-list error:', err);
    return {
      statusCode: 200,
      headers: jsonHeaders(cacheHeaders),
      body: JSON.stringify({ stickers: DEMO_STICKERS, demoMode: true, warning: err.message })
    };
  }
};
