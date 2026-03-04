import { useState, useEffect, useRef } from 'react';

export default function SearchBar({ initialQuery = '', onSearch, variant = 'home' }) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Sync initialQuery with state on route change
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Save to recent searches
      saveRecentSearch(query.trim());
      setShowSuggestions(false);
      onSearch(query.trim());
    }
  };

  const handleFocus = () => {
    const recent = getRecentSearches();
    if (recent.length > 0) {
      setSuggestions(recent);
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    saveRecentSearch(suggestion);
    onSearch(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  // Keyboard: Escape to clear
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (showSuggestions) {
        setShowSuggestions(false);
      } else {
        handleClear();
      }
    }
  };

  return (
    <form className={`search-bar ${variant}`} onSubmit={handleSubmit}>
      <div className="search-input-wrapper">
        <svg className="search-icon" viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search the human web..."
          autoFocus={variant === 'home'}
          aria-label="Search"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <button type="submit" className="search-submit" aria-label="Search">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
        </button>
      </div>

      {/* Recent searches dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="search-suggestions">
          <div className="suggestions-header">
            <span>Recent searches</span>
            <button
              type="button"
              className="suggestions-clear-all"
              onMouseDown={() => {
                clearAllRecentSearches();
                setSuggestions([]);
                setShowSuggestions(false);
              }}
            >
              Clear all
            </button>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} className="suggestion-item-row">
              <button
                className="suggestion-item"
                type="button"
                onMouseDown={() => handleSuggestionClick(s)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" className="suggestion-icon">
                  <path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                </svg>
                {s}
              </button>
              <button
                type="button"
                className="suggestion-delete"
                title="Remove"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  deleteRecentSearch(s);
                  const updated = getRecentSearches();
                  setSuggestions(updated);
                  if (updated.length === 0) setShowSuggestions(false);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}

// ── LocalStorage helpers ──
function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem('hs_recent') || '[]').slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem('hs_recent', JSON.stringify(recent.slice(0, 5)));
  } catch (err) {
    console.warn('Failed to save recent search:', err);
  }
}

function deleteRecentSearch(query) {
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    localStorage.setItem('hs_recent', JSON.stringify(recent));
  } catch (err) {
    console.warn('Failed to delete recent search:', err);
  }
}

function clearAllRecentSearches() {
  try {
    localStorage.removeItem('hs_recent');
  } catch (err) {
    console.warn('Failed to clear recent searches:', err);
  }
}
