/* AEOB — Recommendations Serverless Function
   Personalized episode suggestions based on:
   - User's favorite era and team preferences
   - Their ratings (highly rated episodes → similar ones)
   - Episode metadata tags
   - Community ratings (top-rated episodes) */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';

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

  try {
    const user = verifyToken(event);

    // Fetch all episodes
    const episodes = await base('Episodes').select({
      sort: [{ field: 'EpisodeNumber', direction: 'desc' }]
    }).all();

    const allEpisodes = episodes.map(r => ({
      id: r.id,
      episodeNumber: r.fields.EpisodeNumber || 0,
      title: r.fields.Title || '',
      youtubeUrl: r.fields.YouTubeURL || '',
      era: r.fields.Era || '',
      teams: r.fields.Teams || [],
      hosts: r.fields.Hosts || [],
      metadata: r.fields.Metadata || [],
      description: r.fields.Description || '',
      publishedAt: r.fields.AirDate || '',
      duration: r.fields.Duration || 0
    }));

    // If not logged in, return top-rated episodes as recommendations
    if (!user) {
      const reviews = await base('Reviews').select({
        sort: [{ field: 'Rating', direction: 'desc' }],
        maxRecords: 100
      }).all();

      // Aggregate ratings by episode
      const ratingMap = {};
      reviews.forEach(r => {
        const epId = r.fields.EpisodeId;
        if (!ratingMap[epId]) ratingMap[epId] = { sum: 0, count: 0 };
        ratingMap[epId].sum += (r.fields.Rating || 0);
        ratingMap[epId].count++;
      });

      // Score episodes by average rating
      const scored = allEpisodes.map(ep => {
        const r = ratingMap[ep.id];
        const avgRating = r ? r.sum / r.count : 0;
        return { ...ep, score: avgRating, reason: avgRating > 0 ? 'Top rated by the community' : '' };
      });

      scored.sort((a, b) => b.score - a.score);
      const recommended = scored.filter(e => e.score > 0).slice(0, 12);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ recommendations: recommended, personalized: false })
      };
    }

    // Logged in — personalized recommendations
    // 1. Get user preferences
    const userRecords = await base('Users').find(user.userId);
    const favEra = userRecords.fields.FavEra || '';
    const favTeam = userRecords.fields.FavTeam || '';

    // 2. Get user's past ratings
    const userReviews = await base('Reviews').select({
      filterByFormula: `{UserId} = '${user.userId}'`
    }).all();

    const ratedEpisodeIds = new Set(userReviews.map(r => r.fields.EpisodeId));
    const highlyRated = userReviews
      .filter(r => (r.fields.Rating || 0) >= 7)
      .map(r => r.fields.EpisodeId);

    // 3. Find metadata tags from highly rated episodes
    const preferredTags = new Set();
    allEpisodes.forEach(ep => {
      if (highlyRated.includes(ep.id)) {
        (ep.metadata || []).forEach(tag => preferredTags.add(tag));
        (ep.teams || []).forEach(tag => preferredTags.add(tag));
      }
    });

    // 4. Score unrated episodes
    const scored = allEpisodes
      .filter(ep => !ratedEpisodeIds.has(ep.id))
      .map(ep => {
        let score = 0;
        let reasons = [];

        // Era match
        if (favEra && ep.era === favEra) {
          score += 3;
          reasons.push(`Matches your favorite era (${favEra})`);
        }

        // Team match
        if (favTeam && ep.teams.includes(favTeam)) {
          score += 3;
          reasons.push(`Features ${favTeam}`);
        }

        // Metadata tag match from highly rated episodes
        (ep.metadata || []).forEach(tag => {
          if (preferredTags.has(tag)) score += 1;
        });
        (ep.teams || []).forEach(tag => {
          if (preferredTags.has(tag)) score += 1;
        });

        if (preferredTags.size > 0 && score > 3) {
          reasons.push('Similar to episodes you rated highly');
        }

        // Has YouTube URL (watchable)
        if (ep.youtubeUrl) score += 0.5;

        return { ...ep, score, reason: reasons[0] || '' };
      });

    scored.sort((a, b) => b.score - a.score);
    const recommended = scored.slice(0, 12);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ recommendations: recommended, personalized: true })
    };

  } catch (err) {
    console.error('Recommendations error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate recommendations', recommendations: [] })
    };
  }
};
