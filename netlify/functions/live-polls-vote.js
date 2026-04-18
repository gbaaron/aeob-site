/* AEOB — Vote on a Live Poll (any logged-in user)
   One vote per user per poll, enforced via {VoteKey} = '{pollId}::{userId}'. */

const Airtable = require('airtable');
const { requireUser, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const POLLS_TABLE = 'LivePolls';
const VOTES_TABLE = 'LivePollVotes';

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
    const pollId = String(body.pollId || '').trim();
    const optionIndex = Number(body.optionIndex);

    if (!pollId) return jsonResponse(400, { error: 'pollId required' });
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex > 5) {
      return jsonResponse(400, { error: 'Invalid optionIndex' });
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    // Ensure poll exists, not locked, not deleted
    const poll = await base(POLLS_TABLE).find(pollId).catch(() => null);
    if (!poll) return jsonResponse(404, { error: 'Poll not found' });
    if (poll.fields.IsLocked) return jsonResponse(409, { error: 'Voting is locked on this poll' });
    if (poll.fields.IsDeleted) return jsonResponse(410, { error: 'This poll was removed' });

    const voteKey = `${pollId}::${user.userId}`;

    // Check duplicate
    const existing = await base(VOTES_TABLE).select({
      filterByFormula: `{VoteKey} = '${voteKey.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
      fields: ['VoteKey']
    }).firstPage();

    if (existing.length > 0) {
      return jsonResponse(409, { error: 'You already voted on this poll' });
    }

    await base(VOTES_TABLE).create({
      VoteKey: voteKey,
      PollId: pollId,
      UserId: user.userId,
      OptionIndex: optionIndex,
      CreatedAt: new Date().toISOString()
    });

    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error('live-polls-vote error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to record vote' });
  }
};
