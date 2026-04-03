/* AEOB — Rewards Balance Serverless Function
   Returns user's current points, tier, and activity log */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const USERS_TABLE = 'Users';
const REWARDS_TABLE = 'RewardsLog';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const user = verifyToken(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  try {
    if (!process.env.AIRTABLE_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ points: 0, tier: 'Rookie', activities: [] })
      };
    }

    // Get user record
    const userRecord = await base(USERS_TABLE).find(user.userId);
    const points = userRecord.fields.Points || 0;
    const tier = userRecord.fields.Tier || 'Rookie';

    // Get recent activity
    const records = await base(REWARDS_TABLE).select({
      filterByFormula: `{UserId} = '${user.userId}'`,
      sort: [{ field: 'CreatedAt', direction: 'desc' }],
      maxRecords: 20
    }).all();

    const activities = records.map(r => ({
      action: r.fields.Action,
      points: r.fields.Points,
      timestamp: r.fields.CreatedAt
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ points, tier, activities })
    };

  } catch (err) {
    console.error('Rewards balance error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch rewards' }) };
  }
};
