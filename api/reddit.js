// Vercel Serverless Function — Reddit Search Proxy
// Proxies requests to Reddit's public JSON API with proper headers
// to avoid browser User-Agent restrictions and get full rate limits (~60 req/min)

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, limit = '10', sort = 'relevance', t = 'all' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=${limit}&sort=${sort}&t=${t}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenHumanSearch/1.0 (open-source search engine; serverless proxy)',
        'Accept': 'application/json',
      },
    });

    // Forward rate-limit headers to the client
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }

    if (response.status === 429) {
      return res.status(429).json({ error: 'Reddit rate limit hit. Try again shortly.' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `Reddit returned ${response.status}` });
    }

    const data = await response.json();

    // Cache for 60 seconds at the edge, revalidate in background
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[Reddit Proxy] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch from Reddit' });
  }
}
