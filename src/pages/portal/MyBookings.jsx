import { useState } from 'react';
import { Calendar } from 'lucide-react';
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
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setToCancel(null);
    }
  }

  if (isLoading) return <SkeletonRows rows={4} height={70} />;

  return (
    <div>
      <h1 className="sf-app-page-title sf-mb-4">My bookings</h1>

      <h2 className="sf-mb-2" style={{ fontSize: 'var(--sf-fs-md)' }}>Upcoming</h2>
      {!upcoming.length ? (
        <EmptyState icon={<Calendar size={36} />} title="No upcoming bookings" />
      ) : (
        <div className="sf-card-list sf-mb-6">
          {upcoming.map((a) => (
            <Card key={a.id}>
              <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div className="sf-row-card-title">{a.service?.name}</div>
                  <div className="sf-row-card-meta">{formatDateTime(a.start_at)} &middot; {a.business?.name}</div>
                </div>
                <div className="sf-flex sf-items-center sf-gap-2">
                  <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
                  {['pending', 'confirmed'].includes(a.status) && (
                    <Button size="sm" variant="danger" onClick={() => setToCancel(a)}>Cancel</Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <h2 className="sf-mb-2" style={{ fontSize: 'var(--sf-fs-md)' }}>Past</h2>
      {!past.length ? <p className="sf-muted sf-text-sm">No past bookings.</p> : (
        <div className="sf-card-list">
          {past.map((a) => (
            <Card key={a.id}>
              <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div className="sf-row-card-title">{a.service?.name}</div>
                  <div className="sf-row-card-meta">{formatDateTime(a.start_at)} &middot; {a.business?.name} &middot; {formatMoney(a.service?.price, a.business?.currency)}</div>
                </div>
                <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        onConfirm={confirmCancel}
        title="Cancel this booking?"
        description="This will free up the time slot for others."
        confirmLabel="Cancel booking"
        loading={cancelAppt.isPending}
      />
    </div>
  );
}
