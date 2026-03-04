import DOMPurify from 'dompurify';
import { SOURCES, highlightKeywords } from '../services/searchApi';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}y ago`;
}

function formatUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return u.hostname;
    if (parts.length <= 3) return `${u.hostname} › ${parts.join(' › ')}`;
    return `${u.hostname} › ${parts[0]} › ... › ${parts[parts.length - 1]}`;
  } catch {
    return url;
  }
}

function formatScore(source, meta) {
  switch (source) {
    case 'reddit':
      return { icon: '▲', value: meta?.upvotes?.toLocaleString() || '0', label: 'upvotes' };
    case 'github':
      return { icon: '★', value: meta?.stars?.toLocaleString() || '0', label: 'stars' };
    case 'hackernews':
      return { icon: '▲', value: meta?.points?.toLocaleString() || '0', label: 'points' };
    case 'stackoverflow':
      return { icon: '▲', value: meta?.answers?.toString() || '0', label: 'answers' };
    case 'archiveorg':
      return { icon: '↓', value: meta?.downloads?.toLocaleString() || '0', label: 'downloads' };
    default:
      return null;
  }
}

export default function ResultCard({ result, query }) {
  const source = SOURCES[result.source];
  const scoreInfo = formatScore(result.source, result.meta);
  const highlightedSnippet = query ? highlightKeywords(result.snippet, query) : result.snippet;

  return (
    <div className="result-card">
      <div className="result-source-row">
        <div className="result-source">
          <img
            className="result-favicon"
            src={`https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=32`}
            alt=""
            width="16"
            height="16"
            loading="lazy"
          />
          <span className="result-breadcrumb">{formatUrl(result.url)}</span>
        </div>
        <span
          className="source-badge"
          style={{
            backgroundColor: source?.color + '14',
            color: source?.color,
            borderColor: source?.color + '30',
          }}
        >
          {source?.icon} {source?.name}
        </span>
      </div>

      <h3 className="result-title">
        <a href={result.url} target="_blank" rel="noopener noreferrer">
          {result.title}
        </a>
      </h3>

      {result.snippet && (
        <p
          className="result-snippet"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlightedSnippet) }}
        />
      )}

      <div className="result-meta">
        {scoreInfo && (
          <span className="result-score" style={{ color: source?.color }}>
            {scoreInfo.icon} {scoreInfo.value}
          </span>
        )}
        <span className="result-meta-text">{result.metaText}</span>
        {result.date && <span className="result-time">{timeAgo(result.date)}</span>}
      </div>
    </div>
  );
}
