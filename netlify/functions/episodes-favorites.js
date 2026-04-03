/* AEOB — Episode Favorites Serverless Function
   Manages user's saved/favorite episodes in Airtable */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const FAVORITES_TABLE = 'Favorites';

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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    // GET — list favorites
    if (event.httpMethod === 'GET') {
      const records = await base(FAVORITES_TABLE).select({
        filterByFormula: `{UserId} = '${user.userId}'`,
        sort: [{ field: 'CreatedAt', direction: 'desc' }]
      }).all();

      const favorites = records.map(r => ({
        id: r.id,
        episodeId: r.fields.EpisodeId,
        addedAt: r.fields.CreatedAt
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ favorites }) };
    }

    // POST — add favorite
    if (event.httpMethod === 'POST') {
      const { episodeId } = JSON.parse(event.body);
      if (!episodeId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'episodeId required' }) };
      }

      const record = await base(FAVORITES_TABLE).create({
        UserId: user.userId,
        EpisodeId: episodeId,
        CreatedAt: new Date().toISOString()
      });

      return { statusCode: 200, headers, body: JSON.stringify({ id: record.id, episodeId }) };
    }

    // DELETE — remove favorite
    if (event.httpMethod === 'DELETE') {
      const { episodeId } = JSON.parse(event.body);
      const records = await base(FAVORITES_TABLE).select({
        filterByFormula: `AND({UserId} = '${user.userId}', {EpisodeId} = '${episodeId}')`,
        maxRecords: 1
      }).firstPage();

      if (records.length > 0) {
        await base(FAVORITES_TABLE).destroy(records[0].id);
      }

      return { statusCode: 200, headers, body: JSON.stringify({ removed: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('Favorites error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to manage favorites' }) };
  }
};
