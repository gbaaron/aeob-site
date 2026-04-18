/* AEOB — Create a Live Poll (admin only) */

const Airtable = require('airtable');
const { requireAdmin, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const SESSIONS_TABLE = 'LiveSessions';
const POLLS_TABLE = 'LivePolls';

exports.handler = async (event) => {
  const preflight = handleOptions(event);
  if (preflight) return preflight;

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const gate = requireAdmin(event);
  if (!gate.ok) return gate.response;

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const question = String(body.question || '').trim();
    const options = Array.isArray(body.options)
      ? body.options.map(o => String(o).trim()).filter(Boolean)
      : [];
    const isLocked = !!body.isLocked;

    if (!question) {
      return jsonResponse(400, { error: 'Question is required' });
    }
    if (options.length < 2) {
      return jsonResponse(400, { error: 'At least 2 options are required' });
    }
    if (options.length > 6) {
      return jsonResponse(400, { error: 'Max 6 options' });
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    const sessions = await base(SESSIONS_TABLE).select({
      filterByFormula: `{IsActive} = TRUE()`,
      maxRecords: 1,
      fields: ['Title']
    }).firstPage();

    if (sessions.length === 0) {
      return jsonResponse(409, { error: 'Start a live session before creating polls' });
    }
    const sessionId = sessions[0].id;

    const created = await base(POLLS_TABLE).create({
      Question: question.slice(0, 500),
      SessionId: sessionId,
      Options: JSON.stringify(options),
      IsLocked: isLocked,
      IsDeleted: false,
      CreatedBy: gate.user.userId || gate.user.email || '',
      CreatedAt: new Date().toISOString()
    });

    return jsonResponse(200, {
      success: true,
      poll: {
        id: created.id,
        question,
        options,
        results: options.map(() => 0),
        isLocked,
        createdAt: created.fields.CreatedAt
      }
    });
  } catch (err) {
    console.error('live-polls-create error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to create poll' });
  }
};
