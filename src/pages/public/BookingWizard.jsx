import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, isSameDay } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle2, User } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Field, Input, Textarea } from '../../components/common/FormField';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useToast } from '../../components/common/Toast';
import {
  useBusinessBySlug, usePublicServices, useStaffForService, useSlots, useCreatePublicBooking,
} from '../../features/booking/hooks';
import { bookingCustomerSchema } from '../../schemas/booking';
import { formatMoney, formatDuration, formatTime, formatDate } from '../../utils/format';
import { initials } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import './business.css';

const STEP_LABELS = ['Service', 'Staff', 'Date & time', 'Your details', 'Review'];

export default function BookingWizard() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  const { data: business, isLoading: bizLoading } = useBusinessBySlug(slug);
  const { data: services, isLoading: svcLoading } = usePublicServices(business?.id);

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(params.get('service') || '');
  const [staffMemberId, setStaffMemberId] = useState('');
  const [date, setDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);

  const service = services?.find((s) => s.id === serviceId) || null;
  const { data: staffOptions, isLoading: staffLoading } = useStaffForService(business?.id, serviceId);
  const { data: slots, isLoading: slotsLoading } = useSlots({ businessId: business?.id, serviceId, staffMemberId: staffMemberId || undefined, date });

  const createBooking = useCreatePublicBooking();

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(bookingCustomerSchema) });

  useEffect(() => { setStaffMemberId(''); setSelectedSlot(null); }, [serviceId]);
  useEffect(() => { setSelectedSlot(null); }, [date, staffMemberId]);

  const dateOptions = useMemo(() => Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i)), []);

  async function onConfirm(values) {
    try {
      const result = await createBooking.mutateAsync({
        businessId: business.id,
        serviceId,
        staffMemberId: selectedSlot.staffMemberId || staffMemberId || null,
        startAt: selectedSlot.start.toISOString(),
        customer: { fullName: values.fullName, email: values.email, phone: values.phone },
        customerNote: values.note,
      });
      navigate(`/b/${slug}/book/confirmation/${result.appointment.booking_code}`);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  if (bizLoading || svcLoading) {
    return (
      <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '2rem 0', maxWidth: 640 }}><SkeletonRows rows={5} height={70} /></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '4rem 0' }}><EmptyState title="Business not found" /></div>
      </div>
    );
  }

  function next() { setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  const canProceed = [
    Boolean(serviceId),
    true, // staff step optional
    Boolean(selectedSlot),
    true,
    true,
  ];

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <div className="sf-container" style={{ padding: '2rem 0', maxWidth: 640 }}>
          <Link to={`/b/${slug}`} className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4" style={{ color: 'var(--sf-brand-600)', fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to {business.name}
          </Link>

          <div className="sf-wizard-steps">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className={`sf-wizard-step ${i <= step ? 'sf-wizard-step-done' : ''}`} title={label} />
            ))}
          </div>
          <p className="sf-text-xs sf-muted sf-mb-4">Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}</p>

          <Card padded>
            {step === 0 && (
              <div className="sf-flex-col sf-gap-3">
                {services?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="sf-staff-option"
                    style={{ width: '100%', cursor: 'pointer' }}
                    onClick={() => { setServiceId(s.id); next(); }}
                  >
                    <div style={{ width: 4, alignSelf: 'stretch', background: s.color, borderRadius: 2 }} />
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div className="sf-row-card-title">{s.name}</div>
                      <div className="sf-row-card-meta sf-mt-2">
                        <span>{formatDuration(s.duration_minutes)}</span>
                        <span>{formatMoney(s.price, business.currency)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="sf-flex-col sf-gap-3">
                <p className="sf-muted sf-text-sm sf-mb-2">Choose a staff member, or let us pick the first available.</p>
                <button
                  type="button"
                  className={`sf-staff-option ${!staffMemberId ? 'sf-staff-option-selected' : ''}`}
                  onClick={() => setStaffMemberId('')}
                >
                  <div className="sf-avatar"><User size={16} /></div>
                  <div style={{ fontWeight: 700 }}>No preference — earliest available</div>
                </button>
                {staffLoading ? <SkeletonRows rows={2} height={56} /> : staffOptions?.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`sf-staff-option ${staffMemberId === m.id ? 'sf-staff-option-selected' : ''}`}
                    onClick={() => setStaffMemberId(m.id)}
                  >
                    <div className="sf-avatar">{initials(m.profile?.full_name || 'S')}</div>
                    <div style={{ fontWeight: 700 }}>{m.profile?.full_name}</div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="sf-date-strip sf-mb-4">
                  {dateOptions.map((d) => (
                    <button key={d.toISOString()} type="button" className={`sf-date-chip ${isSameDay(d, date) ? 'sf-date-chip-selected' : ''}`} onClick={() => setDate(d)}>
                      <span>{formatDate(d, 'EEE')}</span>
                      <span style={{ fontSize: 'var(--sf-fs-md)' }}>{formatDate(d, 'd')}</span>
                    </button>
                  ))}
                </div>
                {slotsLoading ? (
                  <SkeletonRows rows={2} height={40} />
                ) : !slots?.length ? (
                  <EmptyState title="No times available" description="Try another date." />
                ) : (
                  <div className="sf-slot-grid">
                    {slots.map((slot) => (
                      <button
                        key={slot.start.toISOString() + slot.staffMemberId}
                        type="button"
                        className={`sf-slot-btn ${selectedSlot?.start.getTime() === slot.start.getTime() ? 'sf-slot-btn-selected' : ''}`}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {formatTime(slot.start)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <form id="booking-details-form" onSubmit={handleSubmit(next)} noValidate>
                <Field label="Full name" required error={errors.fullName?.message} htmlFor="fullName">
                  <Input id="fullName" error={!!errors.fullName} {...register('fullName')} />
                </Field>
                <Field label="Email" required error={errors.email?.message} htmlFor="email">
                  <Input id="email" type="email" error={!!errors.email} {...register('email')} />
                </Field>
                <Field label="Phone" required error={errors.phone?.message} htmlFor="phone">
                  <Input id="phone" type="tel" error={!!errors.phone} {...register('phone')} />
                </Field>
                <Field label="Note (optional)" error={errors.note?.message} htmlFor="note">
                  <Textarea id="note" rows={3} {...register('note')} />
                </Field>
                {/* honeypot field, hidden from real visitors */}
                <input type="text" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} {...register('company')} />
              </form>
            )}

            {step === 4 && (
              <div className="sf-booking-summary">
                <div className="sf-flex sf-justify-between sf-mb-2"><span className="sf-muted">Service</span><strong>{service?.name}</strong></div>
                <div className="sf-flex sf-justify-between sf-mb-2"><span className="sf-muted">Date & time</span><strong>{selectedSlot && `${formatDate(selectedSlot.start)} · ${formatTime(selectedSlot.start)}`}</strong></div>
                <div className="sf-flex sf-justify-between sf-mb-2"><span className="sf-muted">Duration</span><strong>{service && formatDuration(service.duration_minutes)}</strong></div>
                <div className="sf-flex sf-justify-between"><span className="sf-muted">Price</span><strong>{service && formatMoney(service.price, business.currency)}</strong></div>
              </div>
            )}

            <div className="sf-flex sf-justify-between sf-mt-6">
              <Button variant="secondary" onClick={back} disabled={step === 0}>Back</Button>
              {step < 3 && (
                <Button variant="primary" onClick={next} disabled={!canProceed[step]}>Continue <ArrowRight size={16} /></Button>
              )}
              {step === 3 && (
                <Button variant="primary" type="submit" form="booking-details-form">Review booking <ArrowRight size={16} /></Button>
              )}
              {step === 4 && (
                <Button variant="primary" loading={createBooking.isPending} onClick={handleSubmit(onConfirm)}>
                  <CheckCircle2 size={16} /> Confirm booking
                </Button>
              )}
            </div>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
