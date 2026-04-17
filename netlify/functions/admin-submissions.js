/* AEOB — Admin Submissions Moderation

   Methods:
     GET   /admin-submissions?status=Pending   — list
     PATCH /admin-submissions?id=recXXX        — update Status
     DELETE /admin-submissions?id=recXXX       — delete
*/

const Airtable = require('airtable');
const { handleOptions, jsonResponse, requireAdmin } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'Submissions';

function mapRecord(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    title: f.Title || '',
    content: f.Content || f.Body || '',
    author: f.AuthorName || f.Name || '',
    email: f.Email || '',
    status: f.Status || 'Pending',
    votes: f.Votes || 0,
    createdAt: f.CreatedAt || f.SubmittedAt || ''
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
      return jsonResponse(200, { submissions: records.map(mapRecord) });
    }

    if (method === 'PATCH') {
      if (!id) return jsonResponse(400, { error: 'Missing id' });
      const body = JSON.parse(event.body || '{}');
      const fields = {};
      if (body.status) fields.Status = body.status;
      if (body.featured !== undefined) fields.Featured = !!body.featured;
      const record = await base(TABLE).update(id, fields);
      return jsonResponse(200, { submission: mapRecord(record) });
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { error: 'Missing id' });
      await base(TABLE).destroy(id);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-submissions error:', err);
    return jsonResponse(500, { error: err.message || 'Server error' });
  }
};
