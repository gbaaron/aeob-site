/* AEOB — Signup Serverless Function
   Creates a new user in Airtable with hashed password */

const Airtable = require('airtable');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { resolveRole, JWT_SECRET } = require('./_shared/auth');

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

    // Create user in Airtable
    const record = await base(USERS_TABLE).create({
      Name: name,
      Email: email.toLowerCase(),
      Password: hashedPassword,
      FavEra: favEra || '',
      FavTeam: favTeam || '',
      Points: 0,
      Tier: 'Rookie',
      CreatedAt: new Date().toISOString()
    });

    const role = resolveRole(email.toLowerCase(), 'User');

    // Generate JWT
    const token = jwt.sign(
      { userId: record.id, email: email.toLowerCase(), name, role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const user = {
      id: record.id,
      name,
      email: email.toLowerCase(),
      role,
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Signup failed. Please try again.' })
    };
  }
};
