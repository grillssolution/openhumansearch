// Vercel Edge Function — Reddit Search Proxy
// Reddit blocks cloud-provider IPs, so we use PullPush.io (public Reddit mirror API)
// as the primary source, with direct Reddit as fallback.

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = searchParams.get('limit') || '10';
  const sort = searchParams.get('sort') || 'relevance';
  const t = searchParams.get('t') || 'all';

  if (!q) {
    return new Response(JSON.stringify({ error: 'Missing query parameter "q"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Try PullPush.io first (community Reddit mirror — not blocked by IP)
    const data = await fetchFromPullPush(q, limit, sort, t);
    if (data) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    // Fallback: try Reddit directly (may fail from cloud IPs)
    const redditData = await fetchFromReddit(q, limit, sort, t);
    return new Response(JSON.stringify(redditData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('[Reddit Proxy] All sources failed:', err.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch Reddit results' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── PullPush.io — community-maintained Reddit search mirror ──
async function fetchFromPullPush(q, limit, sort, t) {
  try {
    // Map time filter to PullPush's 'after' parameter (epoch seconds)
    const after = getTimeFilter(t);
    const sortParam = sort === 'new' ? 'created_utc' : 'score';

    const url = `https://api.pullpush.io/reddit/search/submission/?q=${encodeURIComponent(q)}&size=${limit}&sort=${sortParam}&sort_type=desc${after ? `&after=${after}` : ''}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[PullPush] returned ${res.status}`);
      return null;
    }

    const json = await res.json();
    const items = json.data || [];

    if (items.length === 0) return null;

    // Convert PullPush format to Reddit's standard format
    return {
      kind: 'Listing',
      data: {
        children: items.map((item) => ({
          kind: 't3',
          data: {
            title: item.title || '',
            permalink: item.permalink || `/r/${item.subreddit}/comments/${item.id}/`,
            selftext: item.selftext || '',
            subreddit: item.subreddit || '',
            subreddit_name_prefixed: `r/${item.subreddit || ''}`,
            score: item.score || 0,
            num_comments: item.num_comments || 0,
            created_utc: item.created_utc || 0,
            url: item.url || '',
            author: item.author || '[deleted]',
          },
        })),
      },
    };
  } catch (err) {
    console.warn('[PullPush] Error:', err.message);
    return null;
  }
}

// ── Direct Reddit fallback ──────────────────────────────────
async function fetchFromReddit(q, limit, sort, t) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=${limit}&sort=${sort}&t=${t}&raw_json=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'OpenHumanSearch/1.0 (open-source search engine)',
      'Accept': 'application/json',
    },
  });
  clearTimeout(timer);

  if (!res.ok) {
    throw new Error(`Reddit returned ${res.status}`);
  }

  return res.json();
}

// ── Time filter helper ──────────────────────────────────────
function getTimeFilter(t) {
  const now = Math.floor(Date.now() / 1000);
  switch (t) {
    case 'hour': return now - 3600;
    case 'day': return now - 86400;
    case 'week': return now - 604800;
    case 'month': return now - 2592000;
    case 'year': return now - 31536000;
    default: return null; // 'all'
  }
}
