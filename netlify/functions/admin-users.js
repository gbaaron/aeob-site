/* AEOB — Admin Users List (read-only)
   GET /admin-users?search=name
   Admin access is controlled by the IsAdmin checkbox in the Users table. */

const Airtable = require('airtable');
const { handleOptions, jsonResponse, requireAdmin } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'Users';

function mapRecord(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    name: f.Name || '',
    email: f.Email || '',
    isAdmin: f.IsAdmin === true,
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

  const search = ((event.queryStringParameters || {}).search || '').toLowerCase();

  try {
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
  } catch (err) {
    console.error('admin-users error:', err);
    return jsonResponse(500, { error: err.message || 'Server error' });
  }
};
