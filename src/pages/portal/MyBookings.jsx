import { useState } from 'react';
import { Calendar, Clock, User, Ban } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import { useMyAppointments, useCancelMyAppointment } from '../../features/portal/hooks';
import { formatDateTime, formatMoney } from '../../utils/format';
import { APPOINTMENT_STATUS_META } from '../../constants/status';
import { toFriendlyError } from '../../utils/errorMessages';
import '../app/app-pages.css';

export default function MyBookings() {
  const { data: appointments, isLoading } = useMyAppointments();
  const cancelAppt = useCancelMyAppointment();
  const toast = useToast();
  const [toCancel, setToCancel] = useState(null);

  const upcoming = (appointments || []).filter((a) => ['pending', 'confirmed', 'checked_in', 'in_progress'].includes(a.status));
  const past = (appointments || []).filter((a) => !['pending', 'confirmed', 'checked_in', 'in_progress'].includes(a.status));

  async function confirmCancel() {
    try {
      await cancelAppt.mutateAsync(toCancel.id);
      toast.success('Your booking has been cancelled.');
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setToCancel(null);
    }
  }

  if (isLoading) return <SkeletonRows rows={4} height={70} />;

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">My Bookings</h1>
          <p className="sf-muted">Review your upcoming sessions and appointment history.</p>
        </div>
      </div>

      <div className="sf-mb-6">
        <h2 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', fontWeight: 700, color: 'var(--cd-primary-dark, #171B24)' }}>
          Upcoming appointments ({upcoming.length})
        </h2>
        {!upcoming.length ? (
          <EmptyState
            icon={<Calendar size={36} style={{ color: 'var(--cd-secondary-text, #747B88)' }} />}
            title="No upcoming bookings"
            description="You don't have any appointments scheduled."
          />
        ) : (
          <div className="sf-card-list">
            {upcoming.map((a) => (
              <Card key={a.id}>
                <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '1rem', padding: '1.25rem' }}>
                  <div className="sf-flex-col sf-gap-1">
                    <div className="sf-flex sf-items-center sf-gap-2">
                      <span style={{ fontFamily: 'var(--cd-font-mono, monospace)', fontWeight: 800, fontSize: 'var(--sf-fs-xs)', background: 'var(--cd-primary-dark, #171B24)', color: 'var(--cd-accent-lime, #C7F36B)', padding: '2px 8px', borderRadius: 4 }}>
                        {a.booking_code}
                      </span>
                      <strong style={{ fontSize: 'var(--sf-fs-md)', color: 'var(--cd-primary-dark, #171B24)' }}>
                        {a.service?.name}
                      </strong>
                    </div>
                    <div className="sf-text-sm sf-muted sf-flex sf-items-center sf-gap-3 sf-mt-1" style={{ flexWrap: 'wrap' }}>
                      <span className="sf-flex sf-items-center sf-gap-1" style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--cd-primary-text, #202531)' }}>
                        <Clock size={14} style={{ color: 'var(--cd-secondary-accent, #7775E8)' }} />
                        {formatDateTime(a.start_at)}
                      </span>
                      <span>&middot;</span>
                      <span>{a.business?.name}</span>
                      {a.staff?.profile?.full_name && (
                        <>
                          <span>&middot;</span>
                          <span className="sf-flex sf-items-center sf-gap-1">
                            <User size={13} />
                            {a.staff.profile.full_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="sf-flex sf-items-center sf-gap-3">
                    <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
                    {['pending', 'confirmed'].includes(a.status) && (
                      <Button size="sm" variant="ghost" onClick={() => setToCancel(a)} style={{ color: 'var(--cd-danger, #D75C5C)' }}>
                        <Ban size={14} /> Cancel
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', fontWeight: 700, color: 'var(--cd-primary-dark, #171B24)' }}>
          Past visits ({past.length})
        </h2>
        {!past.length ? (
          <p className="sf-muted sf-text-sm">No historical appointments on record.</p>
        ) : (
          <div className="sf-card-list">
            {past.map((a) => (
              <Card key={a.id}>
                <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem', padding: '1rem' }}>
                  <div>
                    <div className="sf-flex sf-items-center sf-gap-2">
                      <span style={{ fontFamily: 'var(--cd-font-mono, monospace)', fontSize: '11px', color: 'var(--cd-secondary-text, #747B88)' }}>
                        {a.booking_code}
                      </span>
                      <strong style={{ color: 'var(--cd-primary-dark, #171B24)' }}>{a.service?.name}</strong>
                    </div>
                    <div className="sf-text-xs sf-muted sf-mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatDateTime(a.start_at)} &middot; {a.business?.name} &middot; {formatMoney(a.service?.price, a.business?.currency)}
                    </div>
                  </div>
                  <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        onConfirm={confirmCancel}
        title="Cancel your appointment?"
        description="Are you sure you want to cancel this booking? The slot will be released back to the business calendar."
        confirmLabel="Cancel booking"
        loading={cancelAppt.isPending}
      />
    </div>
  );
}
