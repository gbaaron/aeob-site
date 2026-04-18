/* AEOB — Admin Users
   GET  /admin-users?search=name       → list users
   PATCH /admin-users?id=recXXXX       → body: { role: 'User' | 'Admin' | 'SuperAdmin' }
*/

const Airtable = require('airtable');
const { handleOptions, jsonResponse, requireAdmin } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'Users';
const VALID_ROLES = ['User', 'Admin', 'SuperAdmin'];

function mapRecord(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    name: f.Name || '',
    email: f.Email || '',
    role: f.Role || 'User',
    tier: f.Tier || 'Rookie',
    points: f.Points || 0,
    favEra: f.FavEra || '',
    favTeam: f.FavTeam || '',
    createdAt: f.CreatedAt || ''
  };
}

exports.handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  const method = event.httpMethod;
  const q = event.queryStringParameters || {};

  try {
    if (method === 'GET') {
      const search = (q.search || '').toLowerCase();
      const records = await base(TABLE).select({}).all();
      let users = records.map(mapRecord);
      if (search) {
        users = users.filter(u =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
        );
      }
      users.sort((a, b) => (b.points || 0) - (a.points || 0));
      return jsonResponse(200, { users });
    }

    if (method === 'PATCH') {
      const id = q.id;
      if (!id) return jsonResponse(400, { error: 'Missing user id' });

      let body;
      try { body = JSON.parse(event.body || '{}'); }
      catch { return jsonResponse(400, { error: 'Invalid JSON body' }); }

      const nextRole = (body.role || '').trim();
      if (!VALID_ROLES.includes(nextRole)) {
        return jsonResponse(400, { error: 'role must be one of: ' + VALID_ROLES.join(', ') });
      }

      // Guardrails:
      // - Can't change your own role (prevents self-lockout or self-promotion).
      // - Only SuperAdmin can promote to or demote from SuperAdmin.
      if (auth.user.userId === id) {
        return jsonResponse(403, { error: "You can't change your own role." });
      }

      const existing = await base(TABLE).find(id).catch(() => null);
      if (!existing) return jsonResponse(404, { error: 'User not found' });
      const currentRole = (existing.fields && existing.fields.Role) || 'User';

      const touchesSuper = nextRole === 'SuperAdmin' || currentRole === 'SuperAdmin';
      if (touchesSuper && auth.user.role !== 'SuperAdmin') {
        return jsonResponse(403, { error: 'Only a SuperAdmin can promote to or demote from SuperAdmin.' });
      }

      const updated = await base(TABLE).update(id, { Role: nextRole });
      return jsonResponse(200, { user: mapRecord(updated) });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-users error:', err);
    // Surface Airtable "unknown field" hint — means Role column doesn't exist yet.
    const msg = err && err.message || 'Server error';
    if (/unknown field|INVALID_MULTIPLE_CHOICE_OPTIONS|VALIDATION_ERROR/i.test(msg)) {
      return jsonResponse(500, { error: 'Airtable Users table needs a "Role" single-select field with options: User, Admin, SuperAdmin. (' + msg + ')' });
    }
    return jsonResponse(500, { error: msg });
  }
};
