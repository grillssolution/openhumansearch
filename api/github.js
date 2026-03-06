// Vercel Serverless Function — GitHub Search Proxy
// Proxies requests to GitHub's REST API and injects the authorization token securely.
// This prevents exposing the VITE_GITHUB_TOKEN to the client and increases the rate limit 
// from 60/hr/IP (unauthenticated) to 30/min (authenticated search limit).

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&per_page=10`;

  // The token is stored securely in Vercel environment variables or local .env
  // Note: we check for both VITE_GITHUB_TOKEN and GITHUB_TOKEN for flexibility
  const token = process.env.VITE_GITHUB_TOKEN || process.env.GITHUB_TOKEN;

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OpenHumanSearch/1.0 (open-source search engine; serverless proxy)',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch(url, { headers });

    // Forward GitHub's ratelimit headers so the client can monitor them if needed
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitReset = response.headers.get('x-ratelimit-reset');
    
    if (rateLimitRemaining) res.setHeader('X-RateLimit-Remaining', rateLimitRemaining);
    if (rateLimitReset) res.setHeader('X-RateLimit-Reset', rateLimitReset);

    if (response.status === 403 && rateLimitRemaining === '0') {
      return res.status(429).json({ error: 'GitHub search rate limit exceeded.' });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: `GitHub returned ${response.status}` });
    }

    const data = await response.json();

    // Cache edge responses for 60s to save API quotas
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[GitHub Proxy] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch from GitHub' });
  }
}
