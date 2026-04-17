/* AEOB — Episodes List Serverless Function
   Primary source: Anchor/Spotify RSS feed (real MP3 enclosures)
   Secondary: Airtable Episodes table (era, teams, hosts, featured flags)
   Merges by episode number parsed from RSS title. */

const Airtable = require('airtable');

const RSS_URL = process.env.RSS_FEED_URL || 'https://anchor.fm/s/2f0667a4/podcast/rss';
const RSS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
const EPISODES_TABLE = 'Episodes';

let rssCache = { at: 0, episodes: [] };

// --- RSS parsing ---------------------------------------------------------
function unwrapCdata(s) {
  if (!s) return '';
  const m = String(s).match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (m ? m[1] : String(s)).trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? unwrapCdata(m[1]) : '';
}

function extractAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}="([^"]+)"`, 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

function durationToSeconds(str) {
  if (!str) return 0;
  const parts = String(str).split(':').map(n => parseInt(n, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function parseEpisodeNumber(title) {
  if (!title) return 0;
  const m = title.match(/episode\s*#?\s*(\d+)/i) || title.match(/\bep\.?\s*#?\s*(\d+)/i) || title.match(/^(\d+)[\s:\-]/);
  return m ? parseInt(m[1], 10) : 0;
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function parseRss(xml) {
  const items = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRe) || [];
  for (const block of matches) {
    const title = extractTag(block, 'title');
    const audioUrl = extractAttr(block, 'enclosure', 'url');
    if (!audioUrl) continue;
    const image = extractAttr(block, 'itunes:image', 'href');
    const pubDate = extractTag(block, 'pubDate');
    const durationRaw = extractTag(block, 'itunes:duration');
    const description = extractTag(block, 'description');
    const guid = extractTag(block, 'guid');
    items.push({
      id: guid || audioUrl,
      episodeNumber: parseEpisodeNumber(title),
      title,
      audioUrl,
      youtubeUrl: '',
      image,
      featured: false,
      era: '',
      teams: [],
      hosts: [],
      topics: '',
      publishedAt: pubDate ? new Date(pubDate).toISOString() : '',
      duration: durationToSeconds(durationRaw),
      description: stripHtml(description).slice(0, 500)
    });
  }
  return items;
}

async function loadRssEpisodes() {
  const now = Date.now();
  if (rssCache.at && (now - rssCache.at) < RSS_CACHE_TTL_MS && rssCache.episodes.length) {
    return rssCache.episodes;
  }
  try {
    const res = await fetch(RSS_URL, {
      headers: { 'User-Agent': 'AEOB-Site/1.0 (+https://aeob)' }
    });
    if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
    const xml = await res.text();
    const episodes = parseRss(xml);
    rssCache = { at: now, episodes };
    return episodes;
  } catch (err) {
    console.error('RSS fetch failed:', err);
    return rssCache.episodes || [];
  }
}

// --- Airtable merge ------------------------------------------------------
async function loadAirtableMeta() {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) return new Map();
  try {
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
    const records = await base(EPISODES_TABLE).select().all();
    const byNumber = new Map();
    for (const r of records) {
      const num = r.fields.EpisodeNumber || parseEpisodeNumber(r.fields.Title || '');
      if (!num) continue;
      byNumber.set(num, {
        airtableId: r.id,
        youtubeUrl: r.fields.YouTubeURL || '',
        audioUrl: r.fields.AudioURL || '',
        featured: !!r.fields.Featured,
        era: r.fields.Era || '',
        teams: r.fields.Teams || [],
        hosts: r.fields.Hosts || [],
        topics: r.fields.Topics || '',
        description: r.fields.Description || ''
      });
    }
    return byNumber;
  } catch (err) {
    console.error('Airtable fetch failed:', err);
    return new Map();
  }
}

// --- Handler -------------------------------------------------------------
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const params = event.queryStringParameters || {};
    const page = parseInt(params.page) || 1;
    const pageSize = parseInt(params.pageSize) || 12;
    const search = (params.search || '').toLowerCase();
    const era = params.era || '';
    const team = params.team || '';
    const host = params.host || '';

    const [rssEpisodes, metaMap] = await Promise.all([loadRssEpisodes(), loadAirtableMeta()]);

    // Merge: RSS is source of truth for audio, Airtable supplements metadata
    let episodes = rssEpisodes.map(ep => {
      const meta = metaMap.get(ep.episodeNumber);
      if (!meta) return ep;
      return {
        ...ep,
        id: meta.airtableId || ep.id,
        audioUrl: ep.audioUrl || meta.audioUrl,
        youtubeUrl: meta.youtubeUrl || '',
        featured: meta.featured,
        era: meta.era,
        teams: meta.teams,
        hosts: meta.hosts,
        topics: meta.topics,
        description: meta.description || ep.description
      };
    });

    // Sort newest first by episodeNumber, fallback to publishedAt
    episodes.sort((a, b) => {
      if (b.episodeNumber !== a.episodeNumber) return b.episodeNumber - a.episodeNumber;
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    });

    // Filters
    if (search) {
      episodes = episodes.filter(ep =>
        ep.title.toLowerCase().includes(search) ||
        (ep.description || '').toLowerCase().includes(search) ||
        (ep.topics || '').toLowerCase().includes(search)
      );
    }
    if (era) episodes = episodes.filter(ep => ep.era === era);
    if (team) episodes = episodes.filter(ep => (ep.teams || []).includes(team));
    if (host) episodes = episodes.filter(ep => (ep.hosts || []).includes(host));

    const totalResults = episodes.length;
    const start = (page - 1) * pageSize;
    const paged = episodes.slice(start, start + pageSize);
    const hasMore = start + pageSize < totalResults;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ episodes: paged, totalResults, page, pageSize, hasMore })
    };
  } catch (err) {
    console.error('Episodes fetch error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch episodes', episodes: [], totalResults: 0 })
    };
  }
};
