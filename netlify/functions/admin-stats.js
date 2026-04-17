/* AEOB — Admin Dashboard Stats */

const Airtable = require('airtable');
const { handleOptions, jsonResponse, requireAdmin } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

async function countTable(name, filter) {
  try {
    const records = await base(name).select(filter ? { filterByFormula: filter } : {}).all();
    return records.length;
  } catch (err) {
    // Table may not exist yet in Airtable; return 0 instead of failing the whole dashboard
    return null;
  }
}

exports.handler = async (event) => {
  const opt = handleOptions(event);
  if (opt) return opt;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const [
      users,
      episodes,
      featuredEpisodes,
      products,
      activeProducts,
      predictions,
      openPredictions,
      submissions,
      pendingSubmissions
    ] = await Promise.all([
      countTable('Users'),
      countTable('Episodes'),
      countTable('Episodes', '{Featured} = TRUE()'),
      countTable('MerchProducts'),
      countTable('MerchProducts', "{Status} = 'Active'"),
      countTable('Predictions'),
      countTable('Predictions', "{Status} = 'Open'"),
      countTable('Submissions'),
      countTable('Submissions', "{Status} = 'Pending'")
    ]);

    return jsonResponse(200, {
      stats: {
        users: users ?? 0,
        episodes: episodes ?? 0,
        featuredEpisodes: featuredEpisodes ?? 0,
        products: products ?? 0,
        activeProducts: activeProducts ?? 0,
        predictions: predictions ?? 0,
        openPredictions: openPredictions ?? 0,
        submissions: submissions ?? 0,
        pendingSubmissions: pendingSubmissions ?? 0
      },
      missingTables: {
        MerchProducts: products === null,
        Predictions: predictions === null,
        Submissions: submissions === null
      }
    });
  } catch (err) {
    console.error('admin-stats error:', err);
    return jsonResponse(500, { error: err.message || 'Server error' });
  }
};
