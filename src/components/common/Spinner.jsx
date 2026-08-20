import { Loader2 } from 'lucide-react';

export function PageSpinner({ label = 'Loading...' }) {
  return (
    <div className="sf-flex-col sf-items-center sf-gap-2" style={{ padding: '4rem 0', color: 'var(--sf-text-muted)' }} role="status">
      <Loader2 className="sf-spin" size={28} />
      <span>{label}</span>
    </div>
  );
}
