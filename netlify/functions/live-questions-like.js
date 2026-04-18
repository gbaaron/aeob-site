/* AEOB — Like / Unlike a Question
   One like per user per question. */

const Airtable = require('airtable');
const { requireUser, handleOptions, jsonResponse } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const QUESTIONS_TABLE = 'LiveQuestions';
const LIKES_TABLE = 'LiveQuestionLikes';

exports.handler = async (event) => {
  const preflight = handleOptions(event);
  if (preflight) return preflight;

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const gate = requireUser(event);
  if (!gate.ok) return gate.response;
  const user = gate.user;

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const questionId = String(body.questionId || '').trim();
    if (!questionId) return jsonResponse(400, { error: 'questionId required' });

    if (!process.env.AIRTABLE_API_KEY) {
      return jsonResponse(200, { success: true, demoMode: true });
    }

    const likeKey = `${questionId}::${user.userId}`;

    const existing = await base(LIKES_TABLE).select({
      filterByFormula: `{LikeKey} = '${likeKey.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
      fields: ['LikeKey']
    }).firstPage();

    const question = await base(QUESTIONS_TABLE).find(questionId).catch(() => null);
    if (!question) return jsonResponse(404, { error: 'Question not found' });
    const currentCount = Number(question.fields.LikeCount) || 0;

    if (existing.length > 0) {
      // Toggle off
      await base(LIKES_TABLE).destroy(existing[0].id);
      await base(QUESTIONS_TABLE).update(questionId, {
        LikeCount: Math.max(0, currentCount - 1)
      });
      return jsonResponse(200, { success: true, liked: false });
    }

    await base(LIKES_TABLE).create({
      LikeKey: likeKey,
      QuestionId: questionId,
      UserId: user.userId,
      CreatedAt: new Date().toISOString()
    });
    await base(QUESTIONS_TABLE).update(questionId, {
      LikeCount: currentCount + 1
    });

    return jsonResponse(200, { success: true, liked: true });
  } catch (err) {
    console.error('live-questions-like error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to toggle like' });
  }
};
