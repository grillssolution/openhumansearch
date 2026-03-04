import { Link } from 'react-router-dom';
import { useTheme } from '../components/ThemeToggle';

export default function NotFound() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="home-page not-found-page">
      <div className="home-bg-gradient" />
      
      <header className="results-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'transparent', border: 'none' }}>
        <Link to="/" className="header-logo">
          <span className="logo-human" style={{ fontSize: '0.9em' }}>Open</span>
          <span className="logo-human">Human</span>
          <span className="logo-search">Search</span>
        </Link>
        <button className="theme-toggle header-theme" onClick={toggleTheme} aria-label="Toggle theme">
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

      <div className="home-content">
        <div className="home-logo">
          <h1 style={{ fontSize: '6rem', margin: '0 0 1rem 0', color: 'var(--text)' }}>404</h1>
          <p className="tagline">The page you are looking for does not exist in the human web.</p>
        </div>
        
        <div style={{ marginTop: '2rem' }}>
          <Link to="/" className="load-more-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Go Search
          </Link>
        </div>
      </div>
    </div>
  );
}
