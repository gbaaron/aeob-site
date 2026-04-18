/* AEOB — Signup Serverless Function
   Creates a new user in Airtable with hashed password */

const Airtable = require('airtable');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { resolveIsAdmin, JWT_SECRET } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const USERS_TABLE = 'Users';

exports.handler = async (event) => {
  // CORS headers
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
    const { name, email, password, favEra, favTeam } = JSON.parse(event.body);

    if (!name || !email || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Name, email, and password are required' }) };
    }

    if (password.length < 8) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 8 characters' }) };
    }

    // Check if user already exists
    const existing = await base(USERS_TABLE).select({
      filterByFormula: `{Email} = '${email.replace(/'/g, "\\'")}'`,
      maxRecords: 1
    }).firstPage();

    if (existing.length > 0) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'An account with this email already exists' }) };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Build record — omit single-select fields when no value was chosen
    // (Airtable rejects empty strings for single-select options).
    const fields = {
      Name: name,
      Email: email.toLowerCase(),
      Password: hashedPassword,
      Points: 0,
      Tier: 'Rookie',
      CreatedAt: new Date().toISOString()
    };
    if (favEra) fields.FavEra = favEra;
    if (favTeam) fields.FavTeam = favTeam;

    const record = await base(USERS_TABLE).create(fields);

    const isAdmin = resolveIsAdmin(email.toLowerCase(), false);

    // Generate JWT
    const token = jwt.sign(
      { userId: record.id, email: email.toLowerCase(), name, isAdmin },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const user = {
      id: record.id,
      name,
      email: email.toLowerCase(),
      isAdmin,
      favEra: favEra || '',
      favTeam: favTeam || '',
      points: 0,
      tier: 'Rookie'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ token, user })
    };

  } catch (err) {
    console.error('Signup error:', err);
    const raw = (err && (err.message || err.toString())) || 'Unknown error';
    let friendly = 'Signup failed. Please try again.';
    if (/UNKNOWN_FIELD_NAME/i.test(raw)) {
      friendly = 'Airtable Users table is missing a required field: ' + raw;
    } else if (/INVALID_MULTIPLE_CHOICE_OPTIONS|CANNOT_PARSE|INVALID_VALUE_FOR_COLUMN/i.test(raw)) {
      friendly = 'Airtable rejected a field value: ' + raw;
    } else if (/AUTHENTICATION_REQUIRED|INVALID_API_KEY|NOT_AUTHORIZED/i.test(raw)) {
      friendly = 'Airtable auth failed — check AIRTABLE_API_KEY in Netlify.';
    } else if (/NOT_FOUND|BASE_NOT_FOUND/i.test(raw)) {
      friendly = 'Airtable base or table not found — check AIRTABLE_BASE_ID in Netlify.';
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: friendly, detail: raw })
    };
  }
};
