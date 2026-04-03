/* AEOB — Predictions List Serverless Function
   Fetches active predictions and leaderboard from Airtable */

const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const PREDICTIONS_TABLE = 'Predictions';

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
      // Return placeholder data
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ predictions: getPlaceholderPredictions() })
      };
    }

    const records = await base(PREDICTIONS_TABLE).select({
      sort: [{ field: 'CreatedAt', direction: 'desc' }],
      maxRecords: 20
    }).all();

    const predictions = records.map(r => ({
      id: r.id,
      question: r.fields.Question,
      status: r.fields.Status || 'active',
      picks: JSON.parse(r.fields.Picks || '[]'),
      agreeCount: r.fields.AgreeCount || 0,
      disagreeCount: r.fields.DisagreeCount || 0,
      createdAt: r.fields.CreatedAt
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ predictions }) };

  } catch (err) {
    console.error('Predictions list error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ predictions: getPlaceholderPredictions() })
    };
  }
};

function getPlaceholderPredictions() {
  return [
    {
      id: 'pred-1',
      question: 'PLACEHOLDER: Which team had the most dominant dynasty in PBA history?',
      status: 'active',
      picks: [
        { host: 'Charlie Cuna', pick: 'Crispa Redmanizers' },
        { host: 'Sid Ventura', pick: 'San Miguel Beermen' },
        { host: 'Noel Zarate', pick: 'Toyota Tamaraws' },
        { host: 'Jay Mercado', pick: 'Alaska Milkmen' }
      ],
      agreeCount: 47,
      disagreeCount: 23
    },
    {
      id: 'pred-2',
      question: 'PLACEHOLDER: Who was the greatest import in PBA history?',
      status: 'active',
      picks: [
        { host: 'Charlie Cuna', pick: 'PLACEHOLDER: Import A' },
        { host: 'Sid Ventura', pick: 'PLACEHOLDER: Import B' },
        { host: 'Noel Zarate', pick: 'PLACEHOLDER: Import A' },
        { host: 'Jay Mercado', pick: 'PLACEHOLDER: Import C' }
      ],
      agreeCount: 62,
      disagreeCount: 31
    },
    {
      id: 'pred-3',
      question: 'PLACEHOLDER: Would the 1983 Crispa team beat the 1989 San Miguel team?',
      status: 'active',
      picks: [
        { host: 'Charlie Cuna', pick: 'Crispa in 6' },
        { host: 'Sid Ventura', pick: 'San Miguel in 7' },
        { host: 'Noel Zarate', pick: 'Crispa in 5' },
        { host: 'Jay Mercado', pick: 'San Miguel in 6' }
      ],
      agreeCount: 55,
      disagreeCount: 44
    }
  ];
}
