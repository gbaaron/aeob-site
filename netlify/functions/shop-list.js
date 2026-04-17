/* AEOB — Public Shop Listing
   Reads active products from Airtable MerchProducts table. */

const Airtable = require('airtable');
const { handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const TABLE = 'MerchProducts';

function mapRecord(r) {
  const f = r.fields || {};
  let image = '';
  if (Array.isArray(f.Image) && f.Image[0] && f.Image[0].url) image = f.Image[0].url;
  else if (typeof f.Image === 'string') image = f.Image;
  else if (typeof f.ImageURL === 'string') image = f.ImageURL;

  return {
    id: r.id,
    name: f.Name || '',
    slug: f.Slug || (f.Name || '').toLowerCase().replace(/\s+/g, '-'),
    description: f.Description || '',
    price: typeof f.Price === 'number' ? f.Price : parseFloat(f.Price) || 0,
    comparePrice: typeof f.ComparePrice === 'number' ? f.ComparePrice : (parseFloat(f.ComparePrice) || 0),
    category: f.Category || 'apparel',
    badge: f.Badge || '',
    color: f.Color || '#1a1f5e',
    stock: typeof f.Stock === 'number' ? f.Stock : 999,
    status: f.Status || 'Active',
    sizes: Array.isArray(f.Sizes) ? f.Sizes : (typeof f.Sizes === 'string' ? f.Sizes.split(',').map(s => s.trim()).filter(Boolean) : []),
    image,
    sortOrder: typeof f.SortOrder === 'number' ? f.SortOrder : 0
  };
}

exports.handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  try {
    const records = await base(TABLE).select({
      sort: [{ field: 'SortOrder', direction: 'asc' }]
    }).all();

    const products = records
      .map(mapRecord)
      .filter(p => p.status !== 'Draft' && p.status !== 'Archived');

    return jsonResponse(200, { products });
  } catch (err) {
    console.error('shop-list error:', err);
    // Return empty list so the public page can fall back gracefully
    return jsonResponse(200, { products: [], error: 'Failed to fetch products' });
  }
};
