// ============================================================
// OpenHumanSearch — Search Quality Engine
// Relevance scoring, interleaving, dedup, timeouts
// ============================================================

const SOURCES = {
  reddit: { name: 'Reddit', color: '#FF4500', icon: '🔴' },
  wikipedia: { name: 'Wikipedia', color: '#636466', icon: '📚' },
  github: { name: 'GitHub', color: '#238636', icon: '💻' },
  hackernews: { name: 'Hacker News', color: '#FF6600', icon: '🟠' },
  stackoverflow: { name: 'Stack Overflow', color: '#F48024', icon: '📋' },
  archiveorg: { name: 'Archive.org', color: '#428BCA', icon: '🏛️' },
};

// ── Timeout helper ──────────────────────────────────────────
function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ── Relevance scoring ───────────────────────────────────────

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.#+]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function computeTextRelevance(query, title, snippet) {
  const qLower = query.toLowerCase().trim();
  const titleLower = (title || '').toLowerCase();
  const snippetLower = (snippet || '').toLowerCase();
  const combined = `${titleLower} ${snippetLower}`;

  let score = 0;

  // Exact phrase match in title → highest boost
  if (titleLower.includes(qLower)) {
    score += 100;
  }
  // Exact phrase match in snippet
  if (snippetLower.includes(qLower)) {
    score += 50;
  }

  // Word-level matching
  const queryTokens = tokenize(query);
  const titleTokens = new Set(tokenize(title));
  const allTokens = new Set(tokenize(combined));

  if (queryTokens.length > 0) {
    // Count how many query words appear in the title
    const titleHits = queryTokens.filter((t) => titleTokens.has(t)).length;
    const titleRatio = titleHits / queryTokens.length;
    score += titleRatio * 60; // up to 60 points

    // All query words present → bonus
    const allHits = queryTokens.filter((t) => allTokens.has(t)).length;
    const allRatio = allHits / queryTokens.length;
    score += allRatio * 30; // up to 30 points

    // All words present in title → bonus
    if (titleHits === queryTokens.length) {
      score += 25;
    }
  }

  // Title starts with query → bonus
  if (titleLower.startsWith(qLower)) {
    score += 20;
  }

  return Math.min(score, 250); // cap text relevance
}

function normalizeScore(value, maxExpected) {
  if (!value || value <= 0) return 0;
  // Logarithmic normalization to 0-100 scale
  return Math.min(100, (Math.log10(value + 1) / Math.log10(maxExpected + 1)) * 100);
}

function computeFreshnessScore(dateStr) {
  if (!dateStr) return 50; // neutral if no date
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const ageMs = now - date;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays < 7) return 100;
  if (ageDays < 30) return 90;
  if (ageDays < 90) return 75;
  if (ageDays < 365) return 60;
  if (ageDays < 730) return 40;
  return 20;
}

// Source authority weights — affect how much community score matters
const SOURCE_WEIGHTS = {
  stackoverflow: 1.3,  // Technical Q&A is usually highest signal
  github: 1.2,         // Stars = strong signal
  hackernews: 1.1,     // Curated tech community
  wikipedia: 1.1,      // Encyclopedia quality
  reddit: 0.9,         // Broad but noisy
  archiveorg: 0.8,     // Archival, lower engagement metrics
};

// Max expected raw scores per source (for normalization)
const MAX_SCORES = {
  reddit: 50000,
  wikipedia: 100000,       // word count
  github: 200000,          // stars
  hackernews: 5000,        // points
  stackoverflow: 5000,     // votes
  archiveorg: 100000,      // downloads
};

function computeCompositeScore(query, result) {
  const textScore = computeTextRelevance(query, result.title, result.snippet);
  const communityScore = normalizeScore(result.rawScore || 0, MAX_SCORES[result.source] || 10000);
  const freshnessScore = computeFreshnessScore(result.date);
  const sourceWeight = SOURCE_WEIGHTS[result.source] || 1.0;

  // Weighted composite: text relevance dominates
  const composite =
    textScore * 2.5 +            // 0-625 range (dominates)
    communityScore * sourceWeight + // 0-130 range
    freshnessScore * 0.3;          // 0-30 range

  return Math.round(composite);
}

// ── Source-specific search functions ─────────────────────────

async function searchReddit(query) {
  // Fire phrase and broad queries in parallel for speed
  const phraseQuery = `"${query}"`;
  const [phraseRes, broadRes] = await Promise.allSettled([
    fetchWithTimeout(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(phraseQuery)}&limit=10&sort=relevance&t=all`,
      { headers: { 'Accept': 'application/json' } }
    ).then(r => r.json()),
    fetchWithTimeout(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10&sort=relevance&t=all`,
      { headers: { 'Accept': 'application/json' } }
    ).then(r => r.json()),
  ]);

  const phraseItems = phraseRes.status === 'fulfilled' ? (phraseRes.value?.data?.children || []) : [];
  const broadItems = broadRes.status === 'fulfilled' ? (broadRes.value?.data?.children || []) : [];

  // Merge, phrase results first, deduplicate
  const seen = new Set();
  const allItems = [];
  for (const item of [...phraseItems, ...broadItems]) {
    if (!seen.has(item.data.permalink)) {
      allItems.push(item);
      seen.add(item.data.permalink);
    }
  }

  return allItems.slice(0, 15).map((item) => ({
    source: 'reddit',
    title: item.data.title,
    url: `https://reddit.com${item.data.permalink}`,
    snippet: item.data.selftext?.slice(0, 250) || item.data.subreddit_name_prefixed,
    rawScore: item.data.score,
    score: item.data.score,
    date: new Date(item.data.created_utc * 1000).toISOString(),
    meta: {
      subreddit: `r/${item.data.subreddit}`,
      comments: item.data.num_comments,
      upvotes: item.data.score,
    },
    metaText: `r/${item.data.subreddit} · ${item.data.num_comments} comments · ${item.data.score} upvotes`,
  }));
}

async function searchWikipedia(query) {
  const res = await fetchWithTimeout(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=10`
  );
  const data = await res.json();
  return (data?.query?.search || []).map((item) => ({
    source: 'wikipedia',
    title: item.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
    snippet: item.snippet.replace(/<[^>]*>/g, ''),
    rawScore: item.wordcount,
    score: item.wordcount,
    date: item.timestamp,
    meta: {
      wordcount: item.wordcount,
    },
    metaText: `${item.wordcount.toLocaleString()} words`,
  }));
}

async function searchGitHub(query) {
  const res = await fetchWithTimeout(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=10`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );
  const data = await res.json();
  return (data?.items || []).map((item) => ({
    source: 'github',
    title: item.full_name,
    url: item.html_url,
    snippet: item.description || 'No description available',
    rawScore: item.stargazers_count,
    score: item.stargazers_count,
    date: item.updated_at,
    meta: {
      stars: item.stargazers_count,
      language: item.language,
      forks: item.forks_count,
    },
    metaText: `⭐ ${item.stargazers_count.toLocaleString()} · ${item.language || 'Unknown'} · ${item.forks_count.toLocaleString()} forks`,
  }));
}

async function searchHackerNews(query) {
  const res = await fetchWithTimeout(
    `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=12&tags=story`
  );
  const data = await res.json();
  return (data?.hits || []).map((item) => ({
    source: 'hackernews',
    title: item.title || item.story_title || 'Untitled',
    url: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
    snippet: item.story_text?.replace(/<[^>]*>/g, '').slice(0, 250) || item.url || '',
    rawScore: item.points || 0,
    score: item.points || 0,
    date: item.created_at,
    meta: {
      points: item.points || 0,
      comments: item.num_comments || 0,
    },
    metaText: `${item.points || 0} points · ${item.num_comments || 0} comments`,
  }));
}

async function searchStackOverflow(query) {
  const res = await fetchWithTimeout(
    `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=10&filter=withbody`
  );
  const data = await res.json();
  return (data?.items || []).map((item) => ({
    source: 'stackoverflow',
    title: decodeHTMLEntities(item.title),
    url: item.link,
    snippet: item.body_markdown?.slice(0, 250) || item.body?.replace(/<[^>]*>/g, '').slice(0, 250) || '',
    rawScore: item.score,
    score: item.score,
    date: new Date(item.creation_date * 1000).toISOString(),
    meta: {
      answers: item.answer_count,
      views: item.view_count,
      isAnswered: item.is_answered,
    },
    metaText: `${item.answer_count} answers · ${item.view_count.toLocaleString()} views${item.is_answered ? ' · ✅ Answered' : ''}`,
  }));
}

function decodeHTMLEntities(text) {
  return (text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function searchArchiveOrg(query) {
  const res = await fetchWithTimeout(
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=date&fl[]=downloads&rows=10&page=1&output=json`
  );
  const data = await res.json();
  return (data?.response?.docs || []).map((item) => ({
    source: 'archiveorg',
    title: item.title || item.identifier,
    url: `https://archive.org/details/${item.identifier}`,
    snippet: item.description
      ? (Array.isArray(item.description) ? item.description[0] : item.description).slice(0, 250)
      : '',
    rawScore: item.downloads || 0,
    score: item.downloads || 0,
    date: item.date || '',
    meta: {
      downloads: item.downloads || 0,
    },
    metaText: `${(item.downloads || 0).toLocaleString()} downloads`,
  }));
}

// ── Deduplication ───────────────────────────────────────────

function deduplicateResults(results) {
  const seen = new Map();
  for (const result of results) {
    // Normalize URL for comparison
    const normalizedUrl = result.url
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/^www\./, '');

    if (seen.has(normalizedUrl)) {
      const existing = seen.get(normalizedUrl);
      // Keep the one with higher composite score
      if ((result._compositeScore || 0) > (existing._compositeScore || 0)) {
        seen.set(normalizedUrl, result);
      }
    } else {
      seen.set(normalizedUrl, result);
    }
  }
  return Array.from(seen.values());
}

// ── Smart interleaving ──────────────────────────────────────

function interleaveResults(results, maxConsecutive = 2) {
  // Sort by composite score first
  const sorted = [...results].sort((a, b) => (b._compositeScore || 0) - (a._compositeScore || 0));

  // Enforce source diversity: no more than maxConsecutive from the same source in a row
  const interleaved = [];
  const remaining = [...sorted];

  while (remaining.length > 0) {
    // Count consecutive same-source items at the end of interleaved
    let consecutiveCount = 0;
    let lastSource = null;
    if (interleaved.length > 0) {
      lastSource = interleaved[interleaved.length - 1].source;
      for (let i = interleaved.length - 1; i >= 0; i--) {
        if (interleaved[i].source === lastSource) {
          consecutiveCount++;
        } else break;
      }
    }

    // Find next best result that isn't from the same source (if we've hit the limit)
    let nextIdx = 0;
    if (consecutiveCount >= maxConsecutive) {
      const altIdx = remaining.findIndex((r) => r.source !== lastSource);
      if (altIdx !== -1) {
        nextIdx = altIdx;
      }
      // If all remaining are the same source, just take them in order
    }

    interleaved.push(remaining.splice(nextIdx, 1)[0]);
  }

  return interleaved;
}

// ── Main search function ────────────────────────────────────

const sourceMap = {
  reddit: searchReddit,
  wikipedia: searchWikipedia,
  github: searchGitHub,
  hackernews: searchHackerNews,
  stackoverflow: searchStackOverflow,
  archiveorg: searchArchiveOrg,
};

export async function searchAll(query, enabledSources = null, onProgress = null) {
  const activeSources = enabledSources || Object.keys(sourceMap);

  const allResults = [];
  const sourceErrors = {};
  const sourceCounts = {};

  // Fire all sources and stream results via onProgress as each completes
  const promises = activeSources.map((source) =>
    sourceMap[source](query)
      .catch((err) => {
        console.warn(`[${source}] search failed:`, err.message);
        sourceErrors[source] = err.message || 'Request failed';
        sourceCounts[source] = 0;
        return [];
      })
      .then((items) => {
        if (items.length > 0) {
          sourceCounts[source] = items.length;
          // Score immediately
          for (const item of items) {
            item._compositeScore = computeCompositeScore(query, item);
          }
          allResults.push(...items);

          // Stream intermediate results to the UI
          if (onProgress) {
            const deduplicated = deduplicateResults(allResults);
            const interleaved = interleaveResults(deduplicated);
            onProgress({
              results: interleaved,
              sourceCounts: { ...sourceCounts },
              sourceErrors: { ...sourceErrors },
              total: interleaved.length,
              done: false,
            });
          }
        } else if (!sourceErrors[source]) {
          sourceCounts[source] = 0;
        }
      })
  );

  await Promise.allSettled(promises);

  // Deduplicate
  const deduplicated = deduplicateResults(allResults);

  // Interleave with source diversity
  const interleaved = interleaveResults(deduplicated);

  return {
    results: interleaved,
    sourceCounts,
    sourceErrors,
    total: interleaved.length,
  };
}

export function sortResults(results, sortBy = 'relevance') {
  const sorted = [...results];
  switch (sortBy) {
    case 'score':
      return sorted.sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0));
    case 'date':
      return sorted.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    case 'relevance':
    default:
      return sorted.sort((a, b) => (b._compositeScore || 0) - (a._compositeScore || 0));
  }
}

// ── Keyword highlighting helper ─────────────────────────────

export function highlightKeywords(text, query) {
  if (!text || !query) return text;
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return text;
  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export { SOURCES };
