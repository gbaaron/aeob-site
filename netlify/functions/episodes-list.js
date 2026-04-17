/* AEOB — Episodes List Serverless Function
   Primary source: Airtable Episodes table
   Supports pagination, search, and filtering */

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const EPISODES_TABLE = 'Episodes';

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
    const params = event.queryStringParameters || {};
    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 12;
    const search = (params.search || '').toLowerCase();
    const era = params.era || '';
    const team = params.team || '';
    const host = params.host || '';

    // Fetch all episodes from Airtable sorted by episode number descending
    const records = await base(EPISODES_TABLE).select({
      sort: [{ field: 'EpisodeNumber', direction: 'desc' }]
    }).all();

    // Map Airtable records to episode objects
    let episodes = records.map(r => ({
      id: r.id,
      episodeNumber: r.fields.EpisodeNumber || 0,
      title: r.fields.Title || '',
      youtubeUrl: r.fields.YouTubeURL || '',
      audioUrl: r.fields.AudioURL || '',
      featured: !!r.fields.Featured,
      era: r.fields.Era || '',
      teams: r.fields.Teams || [],
      hosts: r.fields.Hosts || [],
      topics: r.fields.Topics || '',
      publishedAt: r.fields.AirDate || '',
      duration: r.fields.Duration || 0,
      description: r.fields.Description || ''
    }));

    // Apply filters
    if (search) {
      episodes = episodes.filter(ep =>
        ep.title.toLowerCase().includes(search) ||
        ep.description.toLowerCase().includes(search) ||
        ep.topics.toLowerCase().includes(search)
      );
    }
    if (era) {
      episodes = episodes.filter(ep => ep.era === era);
    }
    if (team) {
      episodes = episodes.filter(ep => ep.teams.includes(team));
    }
    if (host) {
      episodes = episodes.filter(ep => ep.hosts.includes(host));
    }

    // Paginate
    const totalResults = episodes.length;
    const start = (page - 1) * pageSize;
    const paged = episodes.slice(start, start + pageSize);
    const hasMore = start + pageSize < totalResults;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        episodes: paged,
        totalResults,
        page,
        pageSize,
        hasMore
      })
    };

  } catch (err) {
    console.error('Episodes fetch error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch episodes', episodes: [], totalResults: 0 })
    };
  }
};
