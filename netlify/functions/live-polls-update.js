/* AEOB — Update a Live Poll (admin only)
   Actions: lock, unlock, delete (soft) */

const Airtable = require('airtable');
const { requireAdmin, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
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
    const pollId = String(body.pollId || '').trim();
    const action = String(body.action || '').trim();

    if (!pollId) return jsonResponse(400, { error: 'pollId required' });
    if (!['lock', 'unlock', 'delete'].includes(action)) {
      return jsonResponse(400, { error: 'action must be lock, unlock, or delete' });
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    const patch = {};
    if (action === 'lock') patch.IsLocked = true;
    if (action === 'unlock') patch.IsLocked = false;
    if (action === 'delete') patch.IsDeleted = true;

    await base(POLLS_TABLE).update(pollId, patch);

    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error('live-polls-update error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to update poll' });
  }
};
