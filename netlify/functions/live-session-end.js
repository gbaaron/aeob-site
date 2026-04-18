/* AEOB — End the Active Live Session (admin only) */

const Airtable = require('airtable');
const { requireAdmin, handleOptions, jsonResponse } = require('./_shared/auth');

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
    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

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

    return jsonResponse(200, { success: true, ended: active.length });
  } catch (err) {
    console.error('live-session-end error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to end session' });
  }
};
