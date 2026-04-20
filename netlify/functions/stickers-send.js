/* AEOB — User sends a paid sticker on the livestream.
   - Open to EVERYONE: any signed-in user with enough credits can send
     any active sticker. Tier gates live on the separate (free) emoji
     reactions feature, not on stickers.
   - Verifies active session
   - Verifies balance, deducts Points, logs a negative RewardsLog entry
   - Rate limit: 1 sticker per user per 3 seconds */

const Airtable = require('airtable');
const { requireUser, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const STICKERS_TABLE = 'LiveStickers';
const SENDS_TABLE = 'LiveStickerSends';
const SESSIONS_TABLE = 'LiveSessions';
const USERS_TABLE = 'Users';
const REWARDS_TABLE = 'RewardsLog';

// Tier is still attached to the send record (so the sender chip can style
// the user's badge on-screen) but it is NOT used to gate what they can send.
const TIERS = [
  { name: 'Rookie',   min: 0 },
  { name: 'Veteran',  min: 250 },
  { name: 'All-Star', min: 750 },
  { name: 'Legend',   min: 1500 }
];
function tierForPoints(points) {
  let tier = 'Rookie';
  for (const t of TIERS) { if (points >= t.min) tier = t.name; }
  return tier;
}

const RATE_LIMIT_MS = 3000;
const MESSAGE_MAX = 80;

function sanitizeMessage(raw) {
  const cleaned = String(raw || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/<[^>]*>/g, '')  // strip any inline tags
    .trim()
    .slice(0, MESSAGE_MAX);
  return cleaned;
}

exports.handler = async (event) => {
  const preflight = handleOptions(event);
  if (preflight) return preflight;

  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const gate = requireUser(event);
  if (!gate.ok) return gate.response;
  const user = gate.user;

  let body;
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const stickerId = String(body.stickerId || '').trim();
  const message = sanitizeMessage(body.message);
  if (!stickerId) return jsonResponse(400, { error: 'stickerId required' });

  if (!process.env.AIRTABLE_API_KEY) {
    return jsonResponse(200, { success: true, demoMode: true, newBalance: 0 });
  }

  try {
    // 1. Load sticker
    let sticker;
    try {
      sticker = await base(STICKERS_TABLE).find(stickerId);
    } catch {
      return jsonResponse(404, { error: 'Sticker not found' });
    }
    if (!sticker.fields.IsActive) {
      return jsonResponse(410, { error: 'Sticker no longer available' });
    }

    const cost = Number(sticker.fields.Cost) || 0;
    const animation = (sticker.fields.AnimationType || 'float').toLowerCase();
    const stickerName = sticker.fields.Name || 'Sticker';
    const stickerEmoji = sticker.fields.Emoji || '\uD83C\uDFC0';
    const stickerImageUrl = sticker.fields.ImageUrl || '';

    // 2. Load user
    let userRec;
    try {
      userRec = await base(USERS_TABLE).find(user.userId);
    } catch {
      return jsonResponse(404, { error: 'User not found' });
    }
    const currentPoints = Number(userRec.fields.Points) || 0;
    const userTier = userRec.fields.Tier || tierForPoints(currentPoints);
    const userName = userRec.fields.Name || user.name || 'Fan';

    // 3. Balance check
    if (currentPoints < cost) {
      return jsonResponse(402, {
        error: `Need ${cost - currentPoints} more credits`,
        balance: currentPoints,
        cost
      });
    }

    // 4. Active session
    const sessions = await base(SESSIONS_TABLE).select({
      filterByFormula: `{IsActive} = TRUE()`,
      maxRecords: 1,
      fields: ['Title']
    }).firstPage();
    if (sessions.length === 0) {
      return jsonResponse(409, { error: 'No live session right now' });
    }
    const sessionId = sessions[0].id;

    // 5. Rate limit per user
    const cutoff = new Date(Date.now() - RATE_LIMIT_MS).toISOString();
    const recentSends = await base(SENDS_TABLE).select({
      filterByFormula: `AND({UserId} = '${String(user.userId).replace(/'/g, "\\'")}', IS_AFTER({CreatedAt}, '${cutoff}'))`,
      maxRecords: 1,
      fields: ['StickerId']
    }).firstPage();
    if (recentSends.length > 0) {
      return jsonResponse(429, { error: 'Slow down a little' });
    }

    // 6. Deduct balance + recompute tier
    const newBalance = currentPoints - cost;
    const newTier = tierForPoints(newBalance);
    await base(USERS_TABLE).update(user.userId, {
      Points: newBalance,
      Tier: newTier
    });

    // 7. Log the spend as a negative RewardsLog entry.
    // Action must be one of the existing singleSelect values; `redeem` is the
    // semantic match for "user spent credits on something." Sticker name goes
    // in the Details field so the audit log stays human-readable.
    await base(REWARDS_TABLE).create({
      UserId: user.userId,
      Action: 'redeem',
      Details: `Sticker: ${stickerName}`,
      Points: -cost,
      CreatedAt: new Date().toISOString()
    }).catch(err => console.warn('RewardsLog write failed (non-fatal):', err.message));

    // 8. Create the send record (denormalized so live-state stays fast)
    const send = await base(SENDS_TABLE).create({
      SessionId: sessionId,
      StickerId: stickerId,
      StickerName: stickerName,
      StickerEmoji: stickerEmoji,
      StickerImageUrl: stickerImageUrl,
      AnimationType: animation,
      Cost: cost,
      UserId: user.userId,
      UserName: userName,
      UserTier: userTier,
      Message: message,
      CreatedAt: new Date().toISOString()
    });

    return jsonResponse(200, {
      success: true,
      sendId: send.id,
      newBalance,
      newTier,
      sticker: { id: stickerId, name: stickerName, emoji: stickerEmoji, animation, cost }
    });
  } catch (err) {
    console.error('stickers-send error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to send sticker' });
  }
};
