/* AEOB — Token Verification Serverless Function
   Verifies JWT and returns user data */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';

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
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'No token provided' }) };
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ valid: true, user: decoded })
    };

  } catch (err) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid or expired token' })
    };
  }
};
