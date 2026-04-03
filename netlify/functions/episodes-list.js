/* AEOB — Episodes List Serverless Function
   Fetches episodes from YouTube Data API v3 playlist */

const fetch = require('node-fetch');

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const PLAYLIST_ID = process.env.YOUTUBE_PLAYLIST_ID; // AEOB YouTube playlist

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
    const params = event.queryStringParameters || {};
    const pageToken = params.pageToken || '';
    const maxResults = params.maxResults || 12;

    if (!YT_API_KEY || !PLAYLIST_ID) {
      // Return placeholder data if API not configured
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          episodes: getPlaceholderEpisodes(),
          nextPageToken: null,
          totalResults: 300
        })
      };
    }

    // Fetch playlist items
    let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${PLAYLIST_ID}&maxResults=${maxResults}&key=${YT_API_KEY}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error('YouTube API error:', data);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          episodes: getPlaceholderEpisodes(),
          nextPageToken: null,
          totalResults: 300
        })
      };
    }

    // Get video durations
    const videoIds = data.items.map(item => item.contentDetails.videoId).join(',');
    let durations = {};

    if (videoIds) {
      const durUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YT_API_KEY}`;
      const durResponse = await fetch(durUrl);
      const durData = await durResponse.json();

      durData.items?.forEach(item => {
        durations[item.id] = parseDuration(item.contentDetails.duration);
      });
    }

    const episodes = data.items.map((item, idx) => {
      const snippet = item.snippet;
      return {
        id: item.contentDetails.videoId,
        videoId: item.contentDetails.videoId,
        title: snippet.title,
        thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        publishedAt: snippet.publishedAt,
        duration: durations[item.contentDetails.videoId] || 7200,
        description: snippet.description?.substring(0, 300) || '',
        era: detectEra(snippet.title + ' ' + snippet.description),
        hosts: [],
        teams: detectTeams(snippet.title + ' ' + snippet.description)
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        episodes,
        nextPageToken: data.nextPageToken || null,
        totalResults: data.pageInfo?.totalResults || episodes.length
      })
    };

  } catch (err) {
    console.error('Episodes fetch error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        episodes: getPlaceholderEpisodes(),
        nextPageToken: null,
        totalResults: 300
      })
    };
  }
};

// Parse YouTube ISO 8601 duration to seconds
function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  return h * 3600 + m * 60 + s;
}

// Detect PBA era from text
function detectEra(text) {
  const lower = text.toLowerCase();
  if (lower.includes('1970') || lower.includes('70s') || lower.includes('founding')) return '1970s';
  if (lower.includes('1980') || lower.includes('80s') || lower.includes('golden age')) return '1980s';
  if (lower.includes('1990') || lower.includes('90s')) return '1990s';
  if (lower.includes('2000') || lower.includes('modern')) return '2000s';
  return '';
}

// Detect PBA teams from text
function detectTeams(text) {
  const lower = text.toLowerCase();
  const teams = [];
  if (lower.includes('crispa')) teams.push('crispa');
  if (lower.includes('toyota')) teams.push('toyota');
  if (lower.includes('ginebra')) teams.push('ginebra');
  if (lower.includes('great taste')) teams.push('great-taste');
  if (lower.includes('san miguel') || lower.includes('beermen')) teams.push('san-miguel');
  if (lower.includes('purefoods')) teams.push('purefoods');
  if (lower.includes('alaska')) teams.push('alaska');
  return teams;
}

// Placeholder episodes when API not configured
function getPlaceholderEpisodes() {
  const episodes = [];
  for (let i = 300; i > 270; i--) {
    const era = i > 280 ? '1990s' : '1980s';
    episodes.push({
      id: `placeholder-${i}`,
      videoId: '',
      title: `PLACEHOLDER: Episode ${i} — PBA History Discussion`,
      thumbnail: '',
      publishedAt: new Date(2024, 0, 1 + (300 - i) * 7).toISOString(),
      duration: 6600 + Math.floor(Math.random() * 1800),
      description: `PLACEHOLDER: This episode covers classic PBA topics.`,
      era: era,
      hosts: ['Charlie Cuna', 'Sid Ventura', 'Noel Zarate'],
      teams: []
    });
  }
  return episodes;
}
