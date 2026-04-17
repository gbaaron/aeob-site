/* AEOB — Admin Predictions Resolver

   Methods:
     GET   /admin-predictions?status=Open  — list predictions
     PATCH /admin-predictions?id=recXXX    — resolve a prediction (set CorrectAnswer + Status=Resolved)
     POST  /admin-predictions              — create a new prediction question
     DELETE /admin-predictions?id=recXXX   — delete
*/

const Airtable = require('airtable');
const { handleOptions, jsonResponse, requireAdmin } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'Predictions';

const ALLOWED_FIELDS = [
  'Question', 'Status', 'Options', 'CorrectAnswer',
  'Episode', 'HostPicks', 'ResolvedAt'
];

function pickFields(src) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  if (Array.isArray(out.Options)) out.Options = JSON.stringify(out.Options);
  if (typeof out.HostPicks === 'object' && out.HostPicks !== null && !Array.isArray(out.HostPicks)) {
    out.HostPicks = JSON.stringify(out.HostPicks);
  }
  return out;
}

function parseJSON(v) {
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return v; }
}

function mapRecord(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    question: f.Question || '',
    status: f.Status || 'Open',
    options: parseJSON(f.Options) || [],
    correctAnswer: f.CorrectAnswer || '',
    episode: f.Episode || '',
    hostPicks: parseJSON(f.HostPicks) || {},
    resolvedAt: f.ResolvedAt || ''
  };
}

exports.handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;
  const qs = event.queryStringParameters || {};
  const id = qs.id;
  const status = qs.status;

  try {
    if (method === 'GET') {
      const sel = {};
      if (status) sel.filterByFormula = `{Status} = '${status.replace(/'/g, "\\'")}'`;
      const records = await base(TABLE).select(sel).all();
      return jsonResponse(200, { predictions: records.map(mapRecord) });
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const fields = pickFields(body);
      if (!fields.Question) return jsonResponse(400, { error: 'Question is required' });
      if (!fields.Status) fields.Status = 'Open';
      const record = await base(TABLE).create(fields);
      return jsonResponse(200, { prediction: mapRecord(record) });
    }

    if (method === 'PATCH') {
      if (!id) return jsonResponse(400, { error: 'Missing id' });
      const body = JSON.parse(event.body || '{}');
      const fields = pickFields(body);
      // If we're setting a correct answer, auto-mark resolved
      if (fields.CorrectAnswer && !fields.Status) {
        fields.Status = 'Resolved';
        fields.ResolvedAt = new Date().toISOString();
      }
      const record = await base(TABLE).update(id, fields);
      return jsonResponse(200, { prediction: mapRecord(record) });
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { error: 'Missing id' });
      await base(TABLE).destroy(id);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-predictions error:', err);
    return jsonResponse(500, { error: err.message || 'Server error' });
  }
};
