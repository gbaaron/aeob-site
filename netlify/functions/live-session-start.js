/* AEOB — Start a Live Session (admin only)
   Ends any currently-active session, then creates a new one. */

const Airtable = require('airtable');
const { requireAdmin, handleOptions, jsonResponse, jsonHeaders } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const SESSIONS_TABLE = 'LiveSessions';

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
    const title = (body.title || 'Live Show').toString().slice(0, 200);
    const streamUrl = (body.streamUrl || '').toString();

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    // End any active sessions
    const active = await base(SESSIONS_TABLE).select({
      filterByFormula: `{IsActive} = TRUE()`,
      fields: ['Title']
    }).firstPage();

    for (const rec of active) {
      await base(SESSIONS_TABLE).update(rec.id, {
        IsActive: false,
        EndedAt: new Date().toISOString()
      });
    }

    // Create new session
    const created = await base(SESSIONS_TABLE).create({
      Title: title,
      StartedAt: new Date().toISOString(),
      StreamUrl: streamUrl,
      IsActive: true,
      CreatedBy: gate.user.userId || gate.user.email || ''
    });

    return jsonResponse(200, {
      success: true,
      session: {
        id: created.id,
        title: created.fields.Title,
        startedAt: created.fields.StartedAt,
        streamUrl: created.fields.StreamUrl || '',
        isActive: true
      }
    });
  } catch (err) {
    console.error('live-session-start error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to start session' });
  }
};
