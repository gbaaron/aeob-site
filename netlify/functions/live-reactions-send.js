/* AEOB — Log an Emoji Reaction
   Tier-gated: server enforces the same rules the client shows.
   Rate-limited: 1 reaction per user per 2 seconds. */

const Airtable = require('airtable');
const { requireUser, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const SESSIONS_TABLE = 'LiveSessions';
const REACTIONS_TABLE = 'LiveReactions';

const TIER_ORDER = ['Rookie', 'Veteran', 'All-Star', 'Legend'];
const REACTION_TIERS = {
  fire: 'Rookie', laugh: 'Rookie', clap: 'Rookie', basketball: 'Rookie',
  shock: 'Veteran', heart: 'Veteran',
  goat: 'All-Star', rocket: 'All-Star',
  crown: 'Legend', diamond: 'Legend'
};

function tierRank(name) {
  const i = TIER_ORDER.indexOf(name);
  return i < 0 ? 0 : i;
}

const RATE_LIMIT_MS = 2000;

exports.handler = async (event) => {
  const preflight = handleOptions(event);
  if (preflight) return preflight;

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const gate = requireUser(event);
  if (!gate.ok) return gate.response;
  const user = gate.user;

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const emoji = String(body.emoji || '').toLowerCase();

    if (!REACTION_TIERS[emoji]) {
      return jsonResponse(400, { error: 'Unknown reaction' });
    }

    const userTier = user.tier || 'Rookie';
    if (tierRank(userTier) < tierRank(REACTION_TIERS[emoji])) {
      return jsonResponse(403, { error: `Reach ${REACTION_TIERS[emoji]} to unlock this reaction` });
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    // Find active session
    const sessions = await base(SESSIONS_TABLE).select({
      filterByFormula: `{IsActive} = TRUE()`,
      maxRecords: 1,
      fields: ['Title']
    }).firstPage();

    if (sessions.length === 0) {
      return jsonResponse(409, { error: 'No live session is active' });
    }
    const sessionId = sessions[0].id;

    // Rate limit: check last reaction from this user
    const cutoff = new Date(Date.now() - RATE_LIMIT_MS).toISOString();
    const recent = await base(REACTIONS_TABLE).select({
      filterByFormula: `AND({UserId} = '${String(user.userId).replace(/'/g, "\\'")}', IS_AFTER({CreatedAt}, '${cutoff}'))`,
      maxRecords: 1,
      fields: ['Emoji']
    }).firstPage();

    if (recent.length > 0) {
      return jsonResponse(429, { error: 'Slow down a little' });
    }

    await base(REACTIONS_TABLE).create({
      Emoji: emoji,
      SessionId: sessionId,
      UserId: user.userId,
      UserName: user.name || '',
      UserTier: userTier,
      CreatedAt: new Date().toISOString()
    });

    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error('live-reactions-send error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to record reaction' });
  }
};
