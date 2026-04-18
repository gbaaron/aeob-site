/* AEOB — Submit a Question during a Live Session
   15-second cooldown per user, enforced server-side. */

const Airtable = require('airtable');
const { requireUser, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const SESSIONS_TABLE = 'LiveSessions';
const QUESTIONS_TABLE = 'LiveQuestions';

const COOLDOWN_MS = 15 * 1000;
const MAX_LENGTH = 500;

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
    const text = String(body.text || '').trim();

    if (!text) return jsonResponse(400, { error: 'Question text required' });
    if (text.length > MAX_LENGTH) {
      return jsonResponse(400, { error: `Keep it under ${MAX_LENGTH} characters` });
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    // Active session
    const sessions = await base(SESSIONS_TABLE).select({
      filterByFormula: `{IsActive} = TRUE()`,
      maxRecords: 1,
      fields: ['Title']
    }).firstPage();

    if (sessions.length === 0) {
      return jsonResponse(409, { error: 'No live session is active' });
    }
    const sessionId = sessions[0].id;

    // Cooldown check
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const recent = await base(QUESTIONS_TABLE).select({
      filterByFormula: `AND({UserId} = '${String(user.userId).replace(/'/g, "\\'")}', IS_AFTER({CreatedAt}, '${cutoff}'))`,
      maxRecords: 1,
      fields: ['Text']
    }).firstPage();

    if (recent.length > 0) {
      return jsonResponse(429, { error: 'Please wait a few seconds before posting again' });
    }

    const created = await base(QUESTIONS_TABLE).create({
      Text: text,
      SessionId: sessionId,
      UserId: user.userId,
      UserName: user.name || 'Anonymous',
      UserTier: user.tier || 'Rookie',
      LikeCount: 0,
      IsAnswered: false,
      IsDeleted: false,
      CreatedAt: new Date().toISOString()
    });

    return jsonResponse(200, {
      success: true,
      question: {
        id: created.id,
        text,
        userId: user.userId,
        userName: user.name || 'Anonymous',
        userTier: user.tier || 'Rookie',
        likeCount: 0,
        isAnswered: false,
        createdAt: created.fields.CreatedAt,
        youLiked: false
      }
    });
  } catch (err) {
    console.error('live-questions-create error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to post question' });
  }
};
