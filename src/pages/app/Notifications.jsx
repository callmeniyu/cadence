import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../features/notifications/hooks';
import { formatRelative } from '../../utils/format';
import './app-pages.css';

function entityLink(n) {
  if (n.entity_type === 'appointment' && n.entity_id) return `/app/appointments/${n.entity_id}`;
  if (n.entity_type === 'invoice' && n.entity_id) return `/app/invoices/${n.entity_id}`;
  return null;
}

export default function Notifications() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Notifications</h1>
          <p className="sf-muted">Booking and payment activity for your workspace.</p>
        </div>
        <Button variant="secondary" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
          <CheckCheck size={16} />Mark all read
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body"><SkeletonRows rows={5} height={50} /></div>
        ) : !notifications?.length ? (
          <CardBody><EmptyState icon={<Bell size={40} strokeWidth={1.5} />} title="No notifications" /></CardBody>
        ) : (
          <div className="sf-flex-col">
            {notifications.map((n) => {
              const link = entityLink(n);
              const content = (
                <div className="sf-flex sf-justify-between sf-items-center" style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--sf-border)', background: n.read_at ? 'transparent' : 'var(--sf-brand-50)' }}>
                  <div>
                    <div style={{ fontWeight: 700 }} className="sf-text-sm">{n.title}</div>
                    <div className="sf-text-sm sf-muted">{n.message}</div>
                    <div className="sf-text-xs sf-muted sf-mt-2">{formatRelative(n.created_at)}</div>
                  </div>
                  {!n.read_at && (
                    <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); markRead.mutate(n.id); }}>Mark read</Button>
                  )}
                </div>
              );
              return link ? <Link key={n.id} to={link} onClick={() => !n.read_at && markRead.mutate(n.id)}>{content}</Link> : <div key={n.id}>{content}</div>;
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
