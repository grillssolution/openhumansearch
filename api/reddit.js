// Vercel Edge Function — Reddit Search Proxy
// Uses Edge Runtime (Cloudflare network) instead of Serverless (AWS)
// to avoid Reddit's IP-based blocks on AWS/cloud-provider ranges.

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Only allow GET requests
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

  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=${limit}&sort=${sort}&t=${t}&raw_json=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenHumanSearch/1.0 (open-source search engine; serverless proxy)',
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      return new Response(JSON.stringify({ error: 'Reddit rate limit hit. Try again shortly.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...(retryAfter ? { 'Retry-After': retryAfter } : {}),
        },
      });
    }

    if (!response.ok) {
      console.error(`[Reddit Proxy] Reddit returned ${response.status}`);
      return new Response(JSON.stringify({ error: `Reddit returned ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    console.error('[Reddit Proxy] Error:', err.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch from Reddit' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
