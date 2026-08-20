import clsx from 'clsx';
import './common.css';

export function Badge({ tone = 'neutral', children, className }) {
  return <span className={clsx('sf-badge', `sf-badge-${tone}`, className)}>{children}</span>;
}

export function StatusBadge({ status, meta }) {
  const entry = meta[status] || { label: status, tone: 'neutral' };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
