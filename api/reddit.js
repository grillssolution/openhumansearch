// Vercel Serverless Function — Reddit Search Proxy
// Proxies requests to Reddit's JSON API.
// Reddit blocks cloud-provider IPs with bot User-Agents,
// so we use a standard browser UA to avoid the block.

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, limit = '10', sort = 'relevance', t = 'all' } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  // Use old.reddit.com — more lenient with server-side requests
  const url = `https://old.reddit.com/search.json?q=${encodeURIComponent(q)}&limit=${limit}&sort=${sort}&t=${t}&raw_json=1`;

  try {
    const response = await fetch(url, {
      headers: {
        // Browser-like headers to avoid Reddit's cloud-IP bot detection
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
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
      console.error(`[Reddit Proxy] Reddit returned ${response.status}`);
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
