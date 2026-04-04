/* AEOB — Top Picks Serverless Function
   Fetches each picker's top 5 episodes from Airtable */

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'TopPicks';

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
      sort: [
        { field: 'Picker', direction: 'asc' },
        { field: 'Rank', direction: 'asc' }
      ]
    }).all();

    // Group by picker
    const grouped = {};
    records.forEach(r => {
      const picker = r.fields.Picker || 'Unknown';
      if (!grouped[picker]) grouped[picker] = [];
      grouped[picker].push({
        rank: r.fields.Rank || 0,
        episodeNumber: r.fields.EpisodeNumber || 0,
        title: r.fields.EpisodeTitle || '',
        why: r.fields.WhyThisEpisode || '',
        youtubeUrl: r.fields.YouTubeURL || ''
      });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ picks: grouped })
    };

  } catch (err) {
    console.error('Top picks error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch top picks', picks: {} })
    };
  }
};
