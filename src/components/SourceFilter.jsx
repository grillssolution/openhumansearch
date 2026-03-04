import { SOURCES } from '../services/searchApi';

export default function SourceFilter({ enabledSources, onToggle, sourceCounts = {}, sourceErrors = {} }) {
  return (
    <div className="source-filter">
      {Object.entries(SOURCES).map(([key, source]) => {
        const count = sourceCounts[key];
        const hasError = !!sourceErrors[key];
        const isActive = enabledSources.includes(key);

        return (
          <button
            key={key}
            className={`source-pill ${isActive ? 'active' : ''} ${hasError ? 'error' : ''}`}
            style={
              isActive
                ? {
                    backgroundColor: source.color + '15',
                    color: source.color,
                    borderColor: source.color + '40',
                  }
                : {}
            }
            onClick={() => onToggle(key)}
            title={hasError ? `${source.name}: ${sourceErrors[key]}` : source.name}
          >
            {source.icon} {source.name}
            {count !== undefined && count > 0 && (
              <span className="source-count">{count}</span>
            )}
            {hasError && <span className="source-error-dot">!</span>}
          </button>
        );
      })}
    </div>
  );
}
