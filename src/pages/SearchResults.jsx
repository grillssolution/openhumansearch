import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import ResultCard from '../components/ResultCard';
import SourceFilter from '../components/SourceFilter';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { searchAll, sortResults, SOURCES } from '../services/searchApi';
import { useTheme } from '../components/ThemeToggle';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [enabledSources, setEnabledSources] = useState(Object.keys(SOURCES));
  const [searchTime, setSearchTime] = useState(null);
  const [sourceCounts, setSourceCounts] = useState({});
  const [sourceErrors, setSourceErrors] = useState({});
  const [visibleCount, setVisibleCount] = useState(20);
  const { theme, toggleTheme } = useTheme();

  const performSearch = useCallback(async (q, sources) => {
    if (!q) return;
    setLoading(true);
    setVisibleCount(20);
    const startTime = performance.now();
    try {
      const data = await searchAll(q, sources, (progress) => {
        // Progressive: show results as each source finishes
        setResults(progress.results);
        setSourceCounts(progress.sourceCounts);
        setSourceErrors(progress.sourceErrors || {});
        setLoading(false); // Stop loading as soon as first results arrive
      });
      // Final update with all results
      setResults(data.results);
      setSourceCounts(data.sourceCounts);
      setSourceErrors(data.sourceErrors || {});
      setSearchTime(((performance.now() - startTime) / 1000).toFixed(2));
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(query, enabledSources);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        document.querySelector('.search-bar.header input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (newQuery) => {
    navigate(`/search?q=${encodeURIComponent(newQuery)}`);
  };

  const handleToggleSource = (source) => {
    setEnabledSources((prev) => {
      const next = prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source];
      if (next.length > 0) {
        performSearch(query, next);
      }
      return next.length > 0 ? next : prev;
    });
  };

  const handleRetrySource = (source) => {
    performSearch(query, [source]);
  };

  const displayResults = sortResults(
    results.filter((r) => enabledSources.includes(r.source)),
    sortBy
  );

  const visibleResults = displayResults.slice(0, visibleCount);
  const hasMore = displayResults.length > visibleCount;

  return (
    <div className="results-page">
      <header className="results-header">
        <Link to="/" className="header-logo">
          <span className="logo-human" style={{ fontSize: '0.9em' }}>Open</span>
          <span className="logo-human">Human</span>
          <span className="logo-search">Search</span>
        </Link>
        <SearchBar initialQuery={query} onSearch={handleSearch} variant="header" />
        <div className="header-shortcut" title="Press / to focus search">
          <kbd>/</kbd>
        </div>
        <button className="theme-toggle header-theme" onClick={toggleTheme} aria-label="Toggle theme" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </header>

      <div className="results-toolbar">
        <SourceFilter
          enabledSources={enabledSources}
          onToggle={handleToggleSource}
          sourceCounts={sourceCounts}
          sourceErrors={sourceErrors}
        />
        <div className="sort-controls">
          <label htmlFor="sort-select">Sort:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="score">Score</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      {/* Source error banners */}
      {Object.keys(sourceErrors).length > 0 && !loading && (
        <div className="source-errors">
          {Object.entries(sourceErrors).map(([src, err]) => (
            <div key={src} className="source-error-banner">
              <span>{SOURCES[src]?.icon} {SOURCES[src]?.name} failed to load</span>
              <button onClick={() => handleRetrySource(src)} className="retry-btn">Retry</button>
            </div>
          ))}
        </div>
      )}

      <main className="results-content">
        {searchTime && !loading && (
          <p className="results-info">
            {displayResults.length} results from {Object.values(sourceCounts).filter(c => c > 0).length} sources ({searchTime}s)
          </p>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : visibleResults.length > 0 ? (
          <>
            <div className="results-list">
              {visibleResults.map((result, i) => (
                <ResultCard key={`${result.source}-${result.url}-${i}`} result={result} query={query} />
              ))}
            </div>
            {hasMore && (
              <button
                className="load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                Show more results ({displayResults.length - visibleCount} remaining)
              </button>
            )}
          </>
        ) : query ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <p>No results found for &ldquo;{query}&rdquo;</p>
            <p className="no-results-hint">Try different keywords or enable more sources</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
