/* AEOB — Admin Shop CRUD
   Methods:
     GET    /admin-shop            — list all products (incl. drafts)
     POST   /admin-shop            — create product (body = product fields)
     PATCH  /admin-shop?id=recXXX  — update product
     DELETE /admin-shop?id=recXXX  — delete product
*/

const Airtable = require('airtable');
const { handleOptions, jsonResponse, requireAdmin } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'MerchProducts';

const ALLOWED_FIELDS = [
  'Name', 'Slug', 'Description', 'Price', 'ComparePrice',
  'Category', 'Badge', 'Color', 'Stock', 'Status',
  'Sizes', 'SortOrder', 'ImageURL'
];

function pickFields(src) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  // Numeric coercion
  if (out.Price !== undefined && out.Price !== '') out.Price = parseFloat(out.Price);
  if (out.ComparePrice !== undefined && out.ComparePrice !== '') out.ComparePrice = parseFloat(out.ComparePrice);
  if (out.Stock !== undefined && out.Stock !== '') out.Stock = parseInt(out.Stock, 10);
  if (out.SortOrder !== undefined && out.SortOrder !== '') out.SortOrder = parseInt(out.SortOrder, 10);
  // Sizes: allow array or comma-separated
  if (typeof out.Sizes === 'string') {
    out.Sizes = out.Sizes.split(',').map(s => s.trim()).filter(Boolean);
  }
  return out;
}

function mapRecord(r) {
  const f = r.fields || {};
  return {
    id: r.id,
    Name: f.Name || '',
    Slug: f.Slug || '',
    Description: f.Description || '',
    Price: f.Price || 0,
    ComparePrice: f.ComparePrice || 0,
    Category: f.Category || 'apparel',
    Badge: f.Badge || '',
    Color: f.Color || '#1a1f5e',
    Stock: typeof f.Stock === 'number' ? f.Stock : 0,
    Status: f.Status || 'Active',
    Sizes: Array.isArray(f.Sizes) ? f.Sizes : [],
    SortOrder: f.SortOrder || 0,
    ImageURL: f.ImageURL || ''
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
        sort: [{ field: 'SortOrder', direction: 'asc' }]
      }).all();
      return jsonResponse(200, { products: records.map(mapRecord) });
    }

    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const fields = pickFields(body);
      if (!fields.Name) return jsonResponse(400, { error: 'Name is required' });
      const record = await base(TABLE).create(fields);
      return jsonResponse(200, { product: mapRecord(record) });
    }

    if (method === 'PATCH') {
      if (!id) return jsonResponse(400, { error: 'Missing id' });
      const body = JSON.parse(event.body || '{}');
      const fields = pickFields(body);
      const record = await base(TABLE).update(id, fields);
      return jsonResponse(200, { product: mapRecord(record) });
    }

    if (method === 'DELETE') {
      if (!id) return jsonResponse(400, { error: 'Missing id' });
      await base(TABLE).destroy(id);
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  } catch (err) {
    console.error('admin-shop error:', err);
    return jsonResponse(500, { error: err.message || 'Server error' });
  }
};
