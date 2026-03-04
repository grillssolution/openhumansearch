export default function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="skeleton-badge" />
          <div className="skeleton-title" />
          <div className="skeleton-text" />
          <div className="skeleton-text short" />
        </div>
      ))}
    </div>
  );
}
