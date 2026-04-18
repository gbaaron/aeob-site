/* AEOB — Consolidated Live State Read
   Returns active session + polls + questions + recent reaction aggregates.
   Cached at the edge for 2 seconds so 100+ viewers don't hammer Airtable.
   Public endpoint (user token optional — used only to flag their own vote/like). */

const Airtable = require('airtable');
const { verifyToken, tokenIsAdmin, handleOptions, jsonResponse, jsonHeaders } = require('./_shared/auth');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const SESSIONS_TABLE = 'LiveSessions';
const POLLS_TABLE = 'LivePolls';
const POLL_VOTES_TABLE = 'LivePollVotes';
const QUESTIONS_TABLE = 'LiveQuestions';
const QUESTION_LIKES_TABLE = 'LiveQuestionLikes';
const REACTIONS_TABLE = 'LiveReactions';

const REACTION_WINDOW_MS = 30 * 1000; // count reactions from the last 30 seconds for the "hot" feel

function safeParseOptions(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Fallback: newline-separated
    return String(raw).split('\n').map(s => s.trim()).filter(Boolean);
  }
}

exports.handler = async (event) => {
  const preflight = handleOptions(event);
  if (preflight) return preflight;

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // Edge cache — Netlify serves the cached response for 2s, stale-while-revalidate for 10s
  const cacheHeaders = {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'Netlify-CDN-Cache-Control': 'public, s-maxage=2, stale-while-revalidate=10'
  };

  const decoded = verifyToken(event);
  const userId = decoded ? decoded.userId : null;

  try {
    if (!process.env.AIRTABLE_API_KEY) {
      return {
        statusCode: 200,
        headers: jsonHeaders(cacheHeaders),
        body: JSON.stringify({ session: null, polls: [], questions: [], reactions: {}, demoMode: true })
      };
    }

    // 1. Active session
    const sessions = await base(SESSIONS_TABLE).select({
      filterByFormula: `{IsActive} = TRUE()`,
      maxRecords: 1,
      sort: [{ field: 'StartedAt', direction: 'desc' }]
    }).firstPage();

    const sessionRec = sessions[0] || null;
    const session = sessionRec ? {
      id: sessionRec.id,
      title: sessionRec.fields.Title || '',
      startedAt: sessionRec.fields.StartedAt || null,
      streamUrl: sessionRec.fields.StreamUrl || '',
      isActive: true
    } : null;

    if (!session) {
      return {
        statusCode: 200,
        headers: jsonHeaders(cacheHeaders),
        body: JSON.stringify({ session: null, polls: [], questions: [], reactions: {} })
      };
    }

    const sessionId = session.id;
    const userFilter = userId ? `'${String(userId).replace(/'/g, "\\'")}'` : null;

    // 2. Polls for this session (non-deleted)
    const pollRecs = await base(POLLS_TABLE).select({
      filterByFormula: `AND({SessionId} = '${sessionId}', NOT({IsDeleted}))`,
      sort: [{ field: 'CreatedAt', direction: 'desc' }]
    }).firstPage();

    const pollIds = pollRecs.map(r => r.id);

    // 3. Poll votes aggregated per poll
    let voteTotalsByPoll = {};
    let userVotesByPoll = {};
    if (pollIds.length > 0) {
      const pollIdClause = pollIds.map(id => `{PollId} = '${id}'`).join(', ');
      const voteRecs = await base(POLL_VOTES_TABLE).select({
        filterByFormula: `OR(${pollIdClause})`,
        fields: ['PollId', 'UserId', 'OptionIndex']
      }).all();

      for (const v of voteRecs) {
        const pid = v.fields.PollId;
        const idx = Number(v.fields.OptionIndex) || 0;
        if (!voteTotalsByPoll[pid]) voteTotalsByPoll[pid] = {};
        voteTotalsByPoll[pid][idx] = (voteTotalsByPoll[pid][idx] || 0) + 1;
        if (userId && v.fields.UserId === userId) {
          userVotesByPoll[pid] = idx;
        }
      }
    }

    const polls = pollRecs.map(rec => {
      const options = safeParseOptions(rec.fields.Options);
      const totals = voteTotalsByPoll[rec.id] || {};
      const results = options.map((_, i) => totals[i] || 0);
      return {
        id: rec.id,
        question: rec.fields.Question || '',
        options,
        results,
        isLocked: !!rec.fields.IsLocked,
        createdAt: rec.fields.CreatedAt || null,
        yourVote: userId && userVotesByPoll[rec.id] !== undefined ? userVotesByPoll[rec.id] : null
      };
    });

    // 4. Questions (non-deleted) for this session
    const questionRecs = await base(QUESTIONS_TABLE).select({
      filterByFormula: `AND({SessionId} = '${sessionId}', NOT({IsDeleted}))`,
      sort: [{ field: 'CreatedAt', direction: 'desc' }],
      maxRecords: 200
    }).firstPage();

    // 5. Which questions has this user liked
    let userLikedQuestions = new Set();
    if (userId && questionRecs.length > 0) {
      const likedRecs = await base(QUESTION_LIKES_TABLE).select({
        filterByFormula: `{UserId} = ${userFilter}`,
        fields: ['QuestionId']
      }).all();
      userLikedQuestions = new Set(likedRecs.map(r => r.fields.QuestionId));
    }

    const questions = questionRecs.map(rec => ({
      id: rec.id,
      text: rec.fields.Text || '',
      userId: rec.fields.UserId || '',
      userName: rec.fields.UserName || 'Anonymous',
      userTier: rec.fields.UserTier || 'Rookie',
      likeCount: Number(rec.fields.LikeCount) || 0,
      isAnswered: !!rec.fields.IsAnswered,
      createdAt: rec.fields.CreatedAt || null,
      youLiked: userLikedQuestions.has(rec.id)
    }));

    // 6. Recent reactions aggregated by emoji (last 30s)
    const since = new Date(Date.now() - REACTION_WINDOW_MS).toISOString();
    const reactionRecs = await base(REACTIONS_TABLE).select({
      filterByFormula: `AND({SessionId} = '${sessionId}', IS_AFTER({CreatedAt}, '${since}'))`,
      fields: ['Emoji']
    }).all();

    const reactions = {};
    for (const r of reactionRecs) {
      const e = r.fields.Emoji;
      if (!e) continue;
      reactions[e] = (reactions[e] || 0) + 1;
    }

    return {
      statusCode: 200,
      headers: jsonHeaders(cacheHeaders),
      body: JSON.stringify({
        session,
        polls,
        questions,
        reactions,
        isAdmin: tokenIsAdmin(decoded),
        serverTime: new Date().toISOString()
      })
    };
  } catch (err) {
    console.error('live-state error:', err);
    return jsonResponse(500, { error: err.message || 'Failed to load live state' });
  }
};
