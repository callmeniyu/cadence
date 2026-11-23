import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Calendar, Receipt, ChevronRight } from 'lucide-react';
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

  const unreadCount = (notifications || []).filter((n) => !n.read_at).length;

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <div className="sf-flex sf-items-center sf-gap-3">
            <h1 className="sf-app-page-title">Notifications</h1>
            {unreadCount > 0 && (
              <span className="sf-badge sf-badge-accent" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="sf-muted sf-mt-1">Operational activity, new customer bookings, and invoice updates.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
            <CheckCheck size={15} /> Mark all as read
          </Button>
        )}
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body"><SkeletonRows rows={5} height={50} /></div>
        ) : !notifications?.length ? (
          <CardBody>
            <EmptyState
              icon={<Bell size={40} strokeWidth={1.5} style={{ color: 'var(--cd-secondary-text, #747B88)' }} />}
              title="Inbox is clear"
              description="You will see notifications here when appointments are booked, cancelled, or paid."
            />
          </CardBody>
        ) : (
          <div className="sf-flex-col">
            {notifications.map((n) => {
              const link = entityLink(n);
              const isUnread = !n.read_at;
              const isAppt = n.entity_type === 'appointment';

              const content = (
                <div
                  className="sf-flex sf-justify-between sf-items-center sf-p-4"
                  style={{
                    borderBottom: '1px solid var(--cd-border-subtle, #ECEFE8)',
                    background: isUnread ? 'rgba(199, 243, 107, 0.08)' : 'transparent',
                    transition: 'background var(--sf-transition)',
                  }}
                >
                  <div className="sf-flex sf-items-start sf-gap-3">
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--sf-radius-md)',
                        background: isUnread ? 'var(--cd-primary-dark, #171B24)' : 'var(--cd-surface-subtle, #FAFBF9)',
                        color: isUnread ? 'var(--cd-accent-lime, #C7F36B)' : 'var(--cd-secondary-text, #747B88)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid var(--cd-border, #E5E8E1)',
                      }}
                    >
                      {isAppt ? <Calendar size={18} /> : <Receipt size={18} />}
                    </div>
                    <div>
                      <div className="sf-flex sf-items-center sf-gap-2">
                        <strong style={{ fontSize: 'var(--sf-fs-sm)', color: 'var(--cd-primary-dark, #171B24)' }}>
                          {n.title}
                        </strong>
                        {isUnread && (
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: 'var(--cd-accent-lime, #C7F36B)',
                              border: '1.5px solid var(--cd-primary-dark, #171B24)',
                              display: 'inline-block',
                            }}
                          />
                        )}
                      </div>
                      <div className="sf-text-sm sf-muted sf-mt-1">{n.message}</div>
                      <div className="sf-text-xs sf-muted sf-mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatRelative(n.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="sf-flex sf-items-center sf-gap-2">
                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markRead.mutate(n.id);
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                    {link && <ChevronRight size={16} className="sf-muted" />}
                  </div>
                </div>
              );

              return link ? (
                <Link
                  key={n.id}
                  to={link}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  onClick={() => isUnread && markRead.mutate(n.id)}
                >
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
