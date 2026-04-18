/* AEOB — Delete or Mark-Answered a Question (admin only) */

const Airtable = require('airtable');
const { requireAdmin, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const QUESTIONS_TABLE = 'LiveQuestions';

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
    const questionId = String(body.questionId || '').trim();
    const action = String(body.action || 'delete').trim();

    if (!questionId) return jsonResponse(400, { error: 'questionId required' });
    if (!['delete', 'answered', 'unanswered'].includes(action)) {
      return jsonResponse(400, { error: 'action must be delete, answered, or unanswered' });
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    const patch = {};
    if (action === 'delete') patch.IsDeleted = true;
    if (action === 'answered') patch.IsAnswered = true;
    if (action === 'unanswered') patch.IsAnswered = false;

    await base(QUESTIONS_TABLE).update(questionId, patch);
    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error('live-questions-delete error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to update question' });
  }
};
