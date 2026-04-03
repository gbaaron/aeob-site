/* AEOB — Submissions List Serverless Function
   Fetches fan submissions from Airtable sorted by votes */

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const SUBMISSIONS_TABLE = 'Submissions';

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
    if (!process.env.AIRTABLE_API_KEY) {
      return { statusCode: 200, headers, body: JSON.stringify({ submissions: [] }) };
    }

    const params = event.queryStringParameters || {};
    const featured = params.featured === 'true';

    let formula = '';
    if (featured) {
      formula = `{Featured} = TRUE()`;
    }

    const options = {
      sort: [{ field: 'Votes', direction: 'desc' }],
      maxRecords: 50
    };
    if (formula) options.filterByFormula = formula;

    const records = await base(SUBMISSIONS_TABLE).select(options).all();

    const submissions = records.map(r => ({
      id: r.id,
      type: r.fields.Type,
      title: r.fields.Title,
      description: r.fields.Description,
      author: r.fields.Author,
      votes: r.fields.Votes || 0,
      featured: r.fields.Featured || false,
      featuredEpisode: r.fields.FeaturedEpisode || '',
      createdAt: r.fields.CreatedAt
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ submissions }) };

  } catch (err) {
    console.error('Submissions list error:', err);
    return { statusCode: 200, headers, body: JSON.stringify({ submissions: [] }) };
  }
};
