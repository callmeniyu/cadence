import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Copy, Printer, ArrowRight } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Card } from '../../components/common/Card';
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

  function copyCode() {
    if (appt?.booking_code) {
      navigator.clipboard.writeText(appt.booking_code);
      toast.success('Confirmation code copied to clipboard');
    }
  }

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
      <PublicHeader />

      <main style={{ flex: 1, padding: '3.5rem 0' }}>
        <div className="sf-container" style={{ maxWidth: 560 }}>
          {isLoading ? (
            <SkeletonRows rows={4} height={60} />
          ) : !appt ? (
            <EmptyState
              title="Booking not found"
              description="We couldn't locate an appointment with that confirmation code."
            />
          ) : (
            <Card padded>
              <div className="sf-flex-col sf-items-center sf-gap-2" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--cd-success-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                  }}
                >
                  <CheckCircle2 size={36} color="var(--cd-success)" />
                </div>
                <h1 style={{ fontSize: 'var(--sf-fs-2xl)', fontWeight: 800, color: 'var(--cd-primary-dark)', letterSpacing: '-0.03em' }}>
                  Booking confirmed!
                </h1>
                <p className="sf-muted sf-text-sm">
                  Your appointment has been securely registered with {appt.business?.name}.
                </p>
              </div>

              {/* Confirmation Code Banner */}
              <div
                style={{
                  background: 'var(--cd-primary-dark)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--sf-radius-md)',
                  padding: '1.25rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                  Confirmation Code
                </div>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: 'var(--cd-accent-lime)',
                    fontFamily: 'var(--sf-font-mono)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <span>{appt.booking_code}</span>
                  <button
                    type="button"
                    onClick={copyCode}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: 6,
                      color: '#FFFFFF',
                      padding: 6,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Copy code"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Appointment summary */}
              <div className="sf-booking-summary">
                <div className="sf-flex sf-justify-between sf-mb-2">
                  <span className="sf-muted">Service</span>
                  <strong>{appt.service?.name}</strong>
                </div>
                <div className="sf-flex sf-justify-between sf-mb-2">
                  <span className="sf-muted">Scheduled time</span>
                  <strong>{formatDateTime(appt.start_at)}</strong>
                </div>
                {appt.staff && (
                  <div className="sf-flex sf-justify-between sf-mb-2">
                    <span className="sf-muted">Practitioner</span>
                    <strong>{appt.staff.profile?.full_name}</strong>
                  </div>
                )}
                <div className="sf-flex sf-justify-between sf-mb-2">
                  <span className="sf-muted">Customer</span>
                  <strong>{appt.customer?.full_name}</strong>
                </div>
                <div className="sf-flex sf-justify-between">
                  <span className="sf-muted">Total fee</span>
                  <strong>{appt.service && formatMoney(appt.service.price, appt.business?.currency)}</strong>
                </div>
              </div>

              <p className="sf-text-xs sf-muted sf-mt-4" style={{ textAlign: 'center' }}>
                Save your confirmation code. You can use it to check your status or manage your visit anytime.
              </p>

              <div className="sf-flex sf-gap-3 sf-mt-5 sf-no-print">
                <Button variant="secondary" block onClick={() => window.print()}>
                  <Printer size={16} /> Print receipt
                </Button>
                {appt.business?.slug && (
                  <Link to={`/b/${appt.business.slug}`} style={{ flex: 1, textDecoration: 'none' }}>
                    <Button variant="primary" block>
                      Done <ArrowRight size={16} />
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
