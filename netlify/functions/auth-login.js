/* AEOB — Login Serverless Function
   Authenticates user against Airtable, returns JWT */

const Airtable = require('airtable');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';
const USERS_TABLE = 'Users';

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

  try {
    const { email, password } = JSON.parse(event.body);

    if (!email || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email and password are required' }) };
    }

    // Find user in Airtable
    const records = await base(USERS_TABLE).select({
      filterByFormula: `{Email} = '${email.toLowerCase().replace(/'/g, "\\'")}'`,
      maxRecords: 1
    }).firstPage();

    if (records.length === 0) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };
    }

    const record = records[0];
    const fields = record.fields;

    // Verify password
    const valid = await bcrypt.compare(password, fields.Password);
    if (!valid) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: record.id, email: fields.Email, name: fields.Name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const user = {
      id: record.id,
      name: fields.Name,
      email: fields.Email,
      favEra: fields.FavEra || '',
      favTeam: fields.FavTeam || '',
      points: fields.Points || 0,
      tier: fields.Tier || 'Rookie'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token, user })
    };

  } catch (err) {
    console.error('Login error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Login failed. Please try again.' })
    };
  }
};
