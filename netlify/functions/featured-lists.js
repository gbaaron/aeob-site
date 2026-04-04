/* AEOB — Featured Lists Serverless Function
   Returns Top 10 of the Year, Trending Last 30 Days, All-Time Greatest */

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'FeaturedLists';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const records = await base(TABLE).select({
      sort: [{ field: 'Rank', direction: 'asc' }]
    }).all();

    const lists = {};
    records.forEach(r => {
      const type = r.fields.ListType || 'Unknown';
      if (!lists[type]) lists[type] = [];
      lists[type].push({
        rank: r.fields.Rank || 0,
        episodeNumber: r.fields.EpisodeNumber || 0,
        title: r.fields.EpisodeTitle || '',
        youtubeUrl: r.fields.YouTubeURL || '',
        year: r.fields.Year || null
      });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ lists })
    };

  } catch (err) {
    console.error('Featured lists error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch lists', lists: {} }) };
  }
};
