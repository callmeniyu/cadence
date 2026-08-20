import { Inbox } from 'lucide-react';
import './common.css';

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="sf-empty" role="status">
      <div className="sf-empty-icon">{icon || <Inbox size={40} strokeWidth={1.5} />}</div>
      <div className="sf-empty-title">{title}</div>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
