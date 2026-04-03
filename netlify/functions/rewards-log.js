/* AEOB — Rewards Log Serverless Function
   Records point-earning activities and updates user total */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const USERS_TABLE = 'Users';
const REWARDS_TABLE = 'RewardsLog';

// Tier thresholds
const TIERS = [
  { name: 'Rookie', min: 0 },
  { name: 'Veteran', min: 250 },
  { name: 'All-Star', min: 750 },
  { name: 'Legend', min: 1500 }
];

function verifyToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function getTierName(points) {
  let tier = 'Rookie';
  for (const t of TIERS) {
    if (points >= t.min) tier = t.name;
  }
  return tier;
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
    const { action, points } = JSON.parse(event.body);

    if (!action || typeof points !== 'number') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Action and points required' }) };
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, newTotal: points, tier: 'Rookie' })
      };
    }

    // Log the activity
    await base(REWARDS_TABLE).create({
      UserId: user.userId,
      Action: action,
      Points: points,
      CreatedAt: new Date().toISOString()
    });

    // Update user total
    const userRecord = await base(USERS_TABLE).find(user.userId);
    const currentPoints = userRecord.fields.Points || 0;
    const newTotal = currentPoints + points;
    const newTier = getTierName(newTotal);

    await base(USERS_TABLE).update(user.userId, {
      Points: newTotal,
      Tier: newTier
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, newTotal, tier: newTier })
    };

  } catch (err) {
    console.error('Rewards log error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to log reward' }) };
  }
};
