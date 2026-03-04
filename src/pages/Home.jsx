import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import { useTheme } from '../components/ThemeToggle';

// Fetch trending topics from HN and GitHub
async function fetchTrending() {
  const cached = sessionStorage.getItem('hs_trending');
  if (cached) {
    const { data, ts } = JSON.parse(cached);
    // Cache for 10 minutes
    if (Date.now() - ts < 10 * 60 * 1000) return data;
  }

  const topics = [];

  // HN top stories — get titles of top 6 stories
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!res.ok) throw new Error('HN Top Stories response not okay');
    const ids = await res.json();
    const top6 = ids.slice(0, 8);
    const stories = await Promise.all(
      top6.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json())
      )
    );
    for (const s of stories) {
      if (s?.title && s.title.length < 60) {
        topics.push({ title: s.title, source: 'hackernews', points: s.score || 0 });
      }
    }
  } catch (err) {
    console.warn('Failed to fetch HN trending:', err);
  }

  // GitHub trending — top repos today
  try {
    const res = await fetch(
      'https://api.github.com/search/repositories?q=created:>' +
        new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) +
        '&sort=stars&order=desc&per_page=4',
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) throw new Error('GitHub Trending response not okay');
    const data = await res.json();
    for (const repo of (data?.items || []).slice(0, 4)) {
      if (repo?.full_name) {
        topics.push({ title: repo.full_name, source: 'github', points: repo.stargazers_count || 0 });
      }
    }
  } catch (err) {
    console.warn('Failed to fetch GitHub trending:', err);
  }

  // Cache in sessionStorage
  try {
    sessionStorage.setItem('hs_trending', JSON.stringify({ data: topics, ts: Date.now() }));
  } catch (err) {
    console.warn('Failed to cache trending data:', err);
  }

  return topics;
}

const SOURCE_ICONS = {
  hackernews: '🟠',
  github: '💻',
  reddit: '🔴',
};

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [trending, setTrending] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  const loadTrending = () => {
    setLoadingTrending(true);
    fetchTrending()
      .then((t) => setTrending(t))
      .catch((err) => {
        console.warn('Failed to load trending topics:', err);
        setTrending([]);
      })
      .finally(() => setLoadingTrending(false));
  };

  useEffect(() => {
    loadTrending();
  }, []);

  const handleSearch = (query) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="home-page">
      <div className="home-bg-gradient" />

      <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
        {theme === 'dark' ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      <div className="home-content">
        <div className="home-logo">
          <h1 className="logo-text">
            <span className="logo-human" style={{ fontSize: '0.85em' }}>Open</span>
            <span className="logo-human">Human</span>
            <span className="logo-search">Search</span>
          </h1>
          <p className="tagline">Search the human web. No SEO spam. No ads. Just humans.</p>
        </div>

        <SearchBar onSearch={handleSearch} variant="home" />

        <div className="home-sources">
          <span className="source-tag reddit">Reddit</span>
          <span className="source-tag wikipedia">Wikipedia</span>
          <span className="source-tag github">GitHub</span>
          <span className="source-tag hackernews">Hacker News</span>
          <span className="source-tag stackoverflow">Stack Overflow</span>
          <span className="source-tag archiveorg">Archive.org</span>
        </div>

        <div className="home-trending">
          <p className="trending-label">
            <span className="trending-dot" />
            Trending now
          </p>
          {loadingTrending ? (
            <div className="trending-skeleton">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="trending-chip-skeleton" style={{ width: `${100 + Math.random() * 120}px` }} />
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="trending-list">
              {trending.map((t, i) => (
                <button
                  key={i}
                  className={`trending-chip ${t.source}`}
                  onClick={() => handleSearch(t.title)}
                  title={`${t.points?.toLocaleString()} ${t.source === 'github' ? 'stars' : 'points'} · ${t.source}`}
                >
                  <span className="trending-chip-icon">{SOURCE_ICONS[t.source] || '📰'}</span>
                  <span className="trending-chip-text">{t.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="trending-empty">
              <p style={{ marginBottom: '8px' }}>Could not load trending topics</p>
              <button 
                onClick={loadTrending}
                className="clear-btn"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', width: 'auto', padding: '4px 12px', borderRadius: '12px', display: 'inline-block' }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="home-footer">
        <p>Searching only trusted, human-generated sources</p>
        <p className="footer-sub">Press <kbd>/</kbd> to search from anywhere</p>
      </footer>
    </div>
  );
}
