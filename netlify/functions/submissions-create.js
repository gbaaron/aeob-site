/* AEOB — Create Submission Serverless Function
   Stores a new fan question/scenario in Airtable */

const Airtable = require('airtable');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const SUBMISSIONS_TABLE = 'Submissions';

function verifyToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const user = verifyToken(event);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  try {
    const { type, title, description } = JSON.parse(event.body);

    if (!type || !title || !description) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Type, title, and description are required' }) };
    }

    if (!['question', 'stats-challenge', 'what-if'].includes(type)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid submission type' }) };
    }

    if (title.length > 100) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Title must be 100 characters or less' }) };
    }

    if (description.length > 500) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Description must be 500 characters or less' }) };
    }

    if (!process.env.AIRTABLE_API_KEY) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, id: 'demo-' + Date.now(), message: 'Submission received (demo mode)' })
      };
    }

    const record = await base(SUBMISSIONS_TABLE).create({
      Type: type,
      Title: title,
      Description: description,
      Author: user.name,
      UserId: user.userId,
      Votes: 0,
      Featured: false,
      CreatedAt: new Date().toISOString()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        id: record.id,
        submission: {
          id: record.id,
          type,
          title,
          description,
          author: user.name,
          votes: 0,
          featured: false,
          createdAt: new Date().toISOString()
        }
      })
    };

  } catch (err) {
    console.error('Submission create error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create submission' }) };
  }
};
