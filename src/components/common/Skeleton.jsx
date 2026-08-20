import './common.css';

export function Skeleton({ width = '100%', height = '1rem', radius, style, className }) {
  return (
    <div
      className={`sf-skel ${className || ''}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRows({ rows = 4, height = 52 }) {
  return (
    <div className="sf-flex-col sf-gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={height} radius={10} />
      ))}
    </div>
  );
}
