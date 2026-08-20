import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Copy } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { SkeletonRows } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useBookingByCode } from '../../features/booking/hooks';
import { useToast } from '../../components/common/Toast';
import { formatDateTime, formatMoney } from '../../utils/format';
import './business.css';

export default function BookingConfirmation() {
  const { code } = useParams();
  const toast = useToast();
  const { data: appt, isLoading } = useBookingByCode(code);

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <div className="sf-container" style={{ padding: '3rem 0', maxWidth: 560 }}>
          {isLoading ? (
            <SkeletonRows rows={4} height={60} />
          ) : !appt ? (
            <EmptyState title="Booking not found" description="We couldn't find a booking with that confirmation code." />
          ) : (
            <Card padded>
              <div className="sf-flex-col sf-items-center sf-gap-2" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle2 size={48} color="var(--sf-success-500)" />
                <h1 style={{ fontSize: 'var(--sf-fs-xl)' }}>Booking confirmed</h1>
                <p className="sf-muted">A confirmation has been recorded for your appointment.</p>
              </div>
              <div className="sf-booking-summary">
                <div className="sf-flex sf-justify-between sf-mb-2">
                  <span className="sf-muted">Confirmation code</span>
                  <strong className="sf-flex sf-items-center sf-gap-1">
                    {appt.booking_code}
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sf-brand-600)' }}
                      onClick={() => { navigator.clipboard.writeText(appt.booking_code); toast.success('Copied'); }}
                      aria-label="Copy code"
                    ><Copy size={14} /></button>
                  </strong>
                </div>
                <div className="sf-flex sf-justify-between sf-mb-2"><span className="sf-muted">Service</span><strong>{appt.service?.name}</strong></div>
                <div className="sf-flex sf-justify-between sf-mb-2"><span className="sf-muted">When</span><strong>{formatDateTime(appt.start_at)}</strong></div>
                <div className="sf-flex sf-justify-between"><span className="sf-muted">Price</span><strong>{appt.service && formatMoney(appt.service.price, appt.business?.currency)}</strong></div>
              </div>
              <p className="sf-text-xs sf-muted sf-mt-4">Save your confirmation code — you can use it to look up this booking any time.</p>
              <Link to="/"><Button variant="secondary" block className="sf-mt-4">Done</Button></Link>
            </Card>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
