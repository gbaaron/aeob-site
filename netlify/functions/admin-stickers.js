/* AEOB — Admin sticker management + free broadcast.
   Handler-style: body { action: 'list'|'create'|'update'|'delete'|'broadcast'|'deleteSend', ... } */

const Airtable = require('airtable');
const { requireAdmin, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const STICKERS_TABLE = 'LiveStickers';
const SENDS_TABLE = 'LiveStickerSends';
const SESSIONS_TABLE = 'LiveSessions';

const VALID_ANIM = new Set(['float', 'rain', 'burst', 'takeover']);
const VALID_TIERS = new Set(['Rookie', 'Veteran', 'All-Star', 'Legend']);

function pickFields(input) {
  const out = {};
  if (input.name !== undefined) out.Name = String(input.name).slice(0, 80);
  if (input.emoji !== undefined) out.Emoji = String(input.emoji).slice(0, 16);
  if (input.imageUrl !== undefined) out.ImageUrl = String(input.imageUrl).slice(0, 500);
  if (input.cost !== undefined) out.Cost = Math.max(0, Number(input.cost) || 0);
  if (input.animationType !== undefined && VALID_ANIM.has(String(input.animationType).toLowerCase())) {
    out.AnimationType = String(input.animationType).toLowerCase();
  }
  if (input.requiredTier !== undefined && VALID_TIERS.has(input.requiredTier)) {
    out.RequiredTier = input.requiredTier;
  }
  if (input.sortOrder !== undefined) out.SortOrder = Number(input.sortOrder) || 0;
  if (input.description !== undefined) out.Description = String(input.description).slice(0, 500);
  if (input.isActive !== undefined) out.IsActive = !!input.isActive;
  return out;
}

exports.handler = async (event) => {
  const preflight = handleOptions(event);
  if (preflight) return preflight;

  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const gate = requireAdmin(event);
  if (!gate.ok) return gate.response;
  const admin = gate.user;

  if (!process.env.AIRTABLE_API_KEY) {
    return jsonResponse(503, { error: 'Airtable not configured' });
  }

  let body;
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch { return jsonResponse(400, { error: 'Invalid JSON' }); }

  const action = String(body.action || '').toLowerCase();

  try {
    if (action === 'list') {
      const recs = await base(STICKERS_TABLE).select({
        sort: [{ field: 'SortOrder', direction: 'asc' }]
      }).all();
      const stickers = recs.map(r => ({
        id: r.id,
        name: r.fields.Name || '',
        emoji: r.fields.Emoji || '',
        imageUrl: r.fields.ImageUrl || '',
        cost: Number(r.fields.Cost) || 0,
        animation: (r.fields.AnimationType || 'float').toLowerCase(),
        tier: r.fields.RequiredTier || 'Rookie',
        description: r.fields.Description || '',
        sortOrder: Number(r.fields.SortOrder) || 0,
        isActive: !!r.fields.IsActive
      }));
      return jsonResponse(200, { stickers });
    }

    if (action === 'create') {
      const fields = pickFields(body);
      if (!fields.Name) return jsonResponse(400, { error: 'Name required' });
      if (fields.IsActive === undefined) fields.IsActive = true;
      if (!fields.AnimationType) fields.AnimationType = 'float';
      if (!fields.RequiredTier) fields.RequiredTier = 'Rookie';
      const rec = await base(STICKERS_TABLE).create(fields);
      return jsonResponse(200, { success: true, id: rec.id });
    }

    if (action === 'update') {
      const id = String(body.id || '').trim();
      if (!id) return jsonResponse(400, { error: 'id required' });
      const fields = pickFields(body);
      if (Object.keys(fields).length === 0) return jsonResponse(400, { error: 'No valid fields to update' });
      await base(STICKERS_TABLE).update(id, fields);
      return jsonResponse(200, { success: true });
    }

    if (action === 'delete') {
      // Soft-delete: flip IsActive to false. Keeps history for SendsTable integrity.
      const id = String(body.id || '').trim();
      if (!id) return jsonResponse(400, { error: 'id required' });
      await base(STICKERS_TABLE).update(id, { IsActive: false });
      return jsonResponse(200, { success: true });
    }

    if (action === 'broadcast') {
      const stickerId = String(body.stickerId || '').trim();
      if (!stickerId) return jsonResponse(400, { error: 'stickerId required' });

      const sticker = await base(STICKERS_TABLE).find(stickerId);
      const sessions = await base(SESSIONS_TABLE).select({
        filterByFormula: `{IsActive} = TRUE()`,
        maxRecords: 1
      }).firstPage();
      if (sessions.length === 0) return jsonResponse(409, { error: 'No live session' });

      const message = String(body.message || '').slice(0, 80);
      const send = await base(SENDS_TABLE).create({
        SessionId: sessions[0].id,
        StickerId: stickerId,
        StickerName: sticker.fields.Name || 'Sticker',
        StickerEmoji: sticker.fields.Emoji || '\uD83C\uDFC0',
        StickerImageUrl: sticker.fields.ImageUrl || '',
        AnimationType: (sticker.fields.AnimationType || 'float').toLowerCase(),
        Cost: 0,
        UserId: admin.userId,
        UserName: 'AEOB Crew',
        UserTier: 'Legend',
        Message: message,
        CreatedAt: new Date().toISOString()
      });
      return jsonResponse(200, { success: true, sendId: send.id });
    }

    if (action === 'deletesend') {
      const sendId = String(body.sendId || '').trim();
      if (!sendId) return jsonResponse(400, { error: 'sendId required' });
      await base(SENDS_TABLE).destroy(sendId);
      return jsonResponse(200, { success: true });
    }

    return jsonResponse(400, { error: 'Unknown action' });
  } catch (err) {
    console.error('admin-stickers error:', err);
    return jsonResponse(500, { error: err.message || 'Admin action failed' });
  }
};
