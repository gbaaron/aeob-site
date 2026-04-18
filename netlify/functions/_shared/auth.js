/* AEOB — Shared Auth Helpers for Netlify Functions
   Files/folders prefixed with _ are skipped by Netlify's function bundler,
   but stay available for require() from sibling functions. */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aeob-dev-secret';

/** Comma-separated emails treated as Admin regardless of Airtable checkbox.
 *  Useful for bootstrapping the first admin. */
function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Resolve admin status from Airtable IsAdmin checkbox + env-var bypass. */
function resolveIsAdmin(email, airtableIsAdmin) {
  if (airtableIsAdmin === true) return true;
  const admins = getAdminEmails();
  if (email && admins.includes(String(email).toLowerCase())) return true;
  return false;
}

function jsonHeaders(extra) {
  return Object.assign({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  }, extra || {});
}

function verifyToken(event) {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

function tokenIsAdmin(decoded) {
  if (!decoded) return false;
  if (decoded.isAdmin === true) return true;
  // Back-compat for older tokens that used a role string
  return decoded.role === 'Admin' || decoded.role === 'SuperAdmin';
}

function requireAdmin(event) {
  const decoded = verifyToken(event);
  if (!decoded) {
    return { ok: false, response: { statusCode: 401, headers: jsonHeaders(), body: JSON.stringify({ error: 'Unauthorized' }) } };
  }
  if (!tokenIsAdmin(decoded)) {
    return { ok: false, response: { statusCode: 403, headers: jsonHeaders(), body: JSON.stringify({ error: 'Forbidden — admin only' }) } };
  }
  return { ok: true, user: decoded };
}

function requireUser(event) {
  const decoded = verifyToken(event);
  if (!decoded) {
    return { ok: false, response: { statusCode: 401, headers: jsonHeaders(), body: JSON.stringify({ error: 'Unauthorized' }) } };
  }
  return { ok: true, user: decoded };
}

function handleOptions(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: jsonHeaders(), body: '' };
  }
  return null;
}

function jsonResponse(statusCode, body, extraHeaders) {
  return {
    statusCode,
    headers: jsonHeaders(extraHeaders),
    body: JSON.stringify(body)
  };
}

module.exports = {
  JWT_SECRET,
  resolveIsAdmin,
  tokenIsAdmin,
  verifyToken,
  requireAdmin,
  requireUser,
  handleOptions,
  jsonHeaders,
  jsonResponse,
  getAdminEmails
};
