/* AEOB — Predictions Vote Serverless Function
   Records a fan vote on a prediction in Airtable */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const PREDICTIONS_TABLE = 'Predictions';
const VOTES_TABLE = 'PredictionVotes';

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
    const { predictionId, choice } = JSON.parse(event.body);

    if (!predictionId || !['agree', 'disagree'].includes(choice)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid predictionId and choice (agree/disagree) required' }) };
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Vote recorded (demo mode)' }) };
    }

    // Check for existing vote
    const existing = await base(VOTES_TABLE).select({
      filterByFormula: `AND({UserId} = '${user.userId}', {PredictionId} = '${predictionId}')`,
      maxRecords: 1
    }).firstPage();

    if (existing.length > 0) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'You already voted on this prediction' }) };
    }

    // Record vote
    await base(VOTES_TABLE).create({
      UserId: user.userId,
      PredictionId: predictionId,
      Choice: choice,
      CreatedAt: new Date().toISOString()
    });

    // Update prediction count
    const field = choice === 'agree' ? 'AgreeCount' : 'DisagreeCount';
    const prediction = await base(PREDICTIONS_TABLE).find(predictionId);
    const currentCount = prediction.fields[field] || 0;

    await base(PREDICTIONS_TABLE).update(predictionId, {
      [field]: currentCount + 1
    });

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('Vote error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to record vote' }) };
  }
};
