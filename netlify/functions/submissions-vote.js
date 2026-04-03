/* AEOB — Submission Upvote Serverless Function
   Increments/decrements vote count on a submission */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const SUBMISSIONS_TABLE = 'Submissions';
const SUB_VOTES_TABLE = 'SubmissionVotes';

function verifyToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = verifyToken(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  try {
    const { submissionId } = JSON.parse(event.body);

    if (!submissionId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'submissionId required' }) };
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // Check for existing vote
    const existing = await base(SUB_VOTES_TABLE).select({
      filterByFormula: `AND({UserId} = '${user.userId}', {SubmissionId} = '${submissionId}')`,
      maxRecords: 1
    }).firstPage();

    if (existing.length > 0) {
      // Remove vote (toggle off)
      await base(SUB_VOTES_TABLE).destroy(existing[0].id);

      const submission = await base(SUBMISSIONS_TABLE).find(submissionId);
      const currentVotes = submission.fields.Votes || 0;
      await base(SUBMISSIONS_TABLE).update(submissionId, {
        Votes: Math.max(0, currentVotes - 1)
      });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, action: 'removed' }) };
    }

    // Add vote
    await base(SUB_VOTES_TABLE).create({
      UserId: user.userId,
      SubmissionId: submissionId,
      CreatedAt: new Date().toISOString()
    });

    const submission = await base(SUBMISSIONS_TABLE).find(submissionId);
    const currentVotes = submission.fields.Votes || 0;
    await base(SUBMISSIONS_TABLE).update(submissionId, {
      Votes: currentVotes + 1
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, action: 'added' }) };

  } catch (err) {
    console.error('Submission vote error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to vote' }) };
  }
};
