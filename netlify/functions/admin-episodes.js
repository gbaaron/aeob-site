/* AEOB — Admin Episodes Management
   Focused read + light edit (AudioURL + Featured flag).
   Full episode CRUD should stay in Airtable for now.

   Methods:
     GET   /admin-episodes            — list all episodes with admin-only fields
     PATCH /admin-episodes?id=recXXX  — update AudioURL / Featured
*/

const Airtable = require('airtable');
const { handleOptions, jsonResponse, requireAdmin } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'Episodes';

const ALLOWED_FIELDS = ['AudioURL', 'Featured'];

function pickFields(src) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  if (out.Featured !== undefined) out.Featured = !!out.Featured;
  return out;
}

function mapRecord(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    episodeNumber: f.EpisodeNumber || 0,
    title: f.Title || '',
    youtubeUrl: f.YouTubeURL || '',
    audioUrl: f.AudioURL || '',
    featured: !!f.Featured,
    era: f.Era || '',
    airDate: f.AirDate || ''
  };
}

exports.handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;
  const id = (event.queryStringParameters || {}).id;

  try {
    if (method === 'GET') {
      const records = await base(TABLE).select({
        sort: [{ field: 'EpisodeNumber', direction: 'desc' }]
      }).all();
      return jsonResponse(200, { episodes: records.map(mapRecord) });
    }

    if (method === 'PATCH') {
      if (!id) return jsonResponse(400, { error: 'Missing id' });
      const body = JSON.parse(event.body || '{}');
      const fields = pickFields(body);
      const record = await base(TABLE).update(id, fields);
      return jsonResponse(200, { episode: mapRecord(record) });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-episodes error:', err);
    return jsonResponse(500, { error: err.message || 'Server error' });
  }
};
