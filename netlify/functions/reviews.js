/* AEOB — Reviews Serverless Function
   GET: fetch reviews for an episode (or all)
   POST: submit a rating + review */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const TABLE = 'Reviews';

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET — fetch reviews
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const episodeId = params.episodeId || '';

      const options = {
        sort: [{ field: 'CreatedAt', direction: 'desc' }],
        maxRecords: 50
      };
      if (episodeId) {
        options.filterByFormula = `{EpisodeId} = '${episodeId}'`;
      }

      const records = await base(TABLE).select(options).all();

      const reviews = records.map(r => ({
        id: r.id,
        episodeId: r.fields.EpisodeId,
        episodeNumber: r.fields.EpisodeNumber,
        userId: r.fields.UserId,
        userName: r.fields.UserName,
        rating: r.fields.Rating,
        review: r.fields.Review,
        createdAt: r.fields.CreatedAt
      }));

      // Calculate average rating for this episode
      const ratings = reviews.filter(r => r.rating).map(r => r.rating);
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ reviews, avgRating, totalRatings: ratings.length })
      };
    }

    // POST — submit review
    if (event.httpMethod === 'POST') {
      const user = verifyToken(event);
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
      }

      const { episodeId, episodeNumber, rating, review } = JSON.parse(event.body);

      if (!episodeId || !rating || rating < 1 || rating > 10) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'episodeId and rating (1-10) required' }) };
      }

      // Check if user already reviewed this episode
      const existing = await base(TABLE).select({
        filterByFormula: `AND({UserId} = '${user.userId}', {EpisodeId} = '${episodeId}')`,
        maxRecords: 1
      }).firstPage();

      if (existing.length > 0) {
        // Update existing review
        await base(TABLE).update(existing[0].id, {
          Rating: rating,
          Review: review || '',
          CreatedAt: new Date().toISOString()
        });
        return { statusCode: 200, headers, body: JSON.stringify({ success: true, action: 'updated' }) };
      }

      // Create new review
      await base(TABLE).create({
        EpisodeId: episodeId,
        EpisodeNumber: episodeNumber || 0,
        UserId: user.userId,
        UserName: user.name,
        Rating: rating,
        Review: review || '',
        CreatedAt: new Date().toISOString()
      });

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, action: 'created' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  } catch (err) {
    console.error('Reviews error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to process review' }) };
  }
};
