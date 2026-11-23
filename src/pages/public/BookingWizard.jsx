import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, isSameDay } from 'date-fns';
import { ArrowLeft, ArrowRight, CheckCircle2, User, Clock, Calendar } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Field, Input, Textarea } from '../../components/common/FormField';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useToast } from '../../components/common/Toast';
import {
  useBusinessBySlug,
  usePublicServices,
  useStaffForService,
  useSlots,
  useCreatePublicBooking,
} from '../../features/booking/hooks';
import { bookingCustomerSchema } from '../../schemas/booking';
import { formatMoney, formatDuration, formatTime, formatDate, initials } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import './business.css';

const STEP_LABELS = ['Service', 'Staff', 'Date & Time', 'Your Details', 'Confirm'];

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
  const { data: slots, isLoading: slotsLoading } = useSlots({
    businessId: business?.id,
    serviceId,
    staffMemberId: staffMemberId || undefined,
    date,
  });

  const createBooking = useCreatePublicBooking();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(bookingCustomerSchema),
  });

  const dateOptions = useMemo(() => Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i)), []);

  function handleServiceChange(id) {
    setServiceId(id);
    setStaffMemberId('');
    setSelectedSlot(null);
    setStep(1);
  }

  function handleStaffChange(id) {
    setStaffMemberId(id);
    setSelectedSlot(null);
    setStep(2);
  }

  function handleDateChange(newDate) {
    setDate(newDate);
    setSelectedSlot(null);
  }

  async function onConfirm(values) {
    if (!selectedSlot) {
      toast.error('Please select an available time slot.');
      return;
    }
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
      <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '3rem 0', maxWidth: 640 }}>
          <SkeletonRows rows={5} height={70} />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
        <PublicHeader />
        <div className="sf-container" style={{ padding: '4rem 0' }}>
          <EmptyState title="Business not found" />
        </div>
      </div>
    );
  }

  function next() {
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const canProceed = [
    Boolean(serviceId),
    true, // staff step is optional
    Boolean(selectedSlot),
    true,
    true,
  ];

  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
      <PublicHeader />

      <main style={{ flex: 1, padding: '2.5rem 0 4rem' }}>
        <div className="sf-container" style={{ maxWidth: 620 }}>
          <Link
            to={`/b/${slug}`}
            className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4"
            style={{ color: 'var(--cd-primary-dark)', fontWeight: 600, textDecoration: 'none' }}
          >
            <ArrowLeft size={14} /> Back to {business.name}
          </Link>

          {/* Stepper Indicator */}
          <div className="sf-wizard-steps">
            {STEP_LABELS.map((label, i) => (
              <div
                key={label}
                className={`sf-wizard-step ${i < step ? 'sf-wizard-step-done' : i === step ? 'sf-wizard-step-current' : ''}`}
                title={label}
              />
            ))}
          </div>

          <div className="sf-flex sf-justify-between sf-items-center sf-mb-4">
            <span style={{ fontSize: 'var(--sf-fs-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cd-secondary-text)', letterSpacing: '0.05em' }}>
              Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
            </span>
            {service && (
              <span className="sf-badge sf-badge-neutral" style={{ fontSize: 11 }}>
                {service.name}
              </span>
            )}
          </div>

          <Card padded>
            {/* Step 0: Choose Service */}
            {step === 0 && (
              <div className="sf-flex-col sf-gap-3">
                <h2 style={{ fontSize: 'var(--sf-fs-lg)', fontWeight: 700, color: 'var(--cd-primary-dark)', marginBottom: 4 }}>
                  Choose a service
                </h2>
                {services?.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="sf-staff-option"
                    style={{
                      width: '100%',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderColor: serviceId === s.id ? 'var(--cd-primary-dark)' : undefined,
                      background: serviceId === s.id ? 'var(--cd-surface-subtle)' : undefined,
                    }}
                    onClick={() => handleServiceChange(s.id)}
                  >
                    <div style={{ width: 4, alignSelf: 'stretch', background: s.color || 'var(--cd-primary-dark)', borderRadius: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div className="sf-row-card-title">{s.name}</div>
                      {s.description && (
                        <p className="sf-muted sf-text-xs sf-mt-1" style={{ maxWidth: 440 }}>
                          {s.description}
                        </p>
                      )}
                      <div className="sf-row-card-meta sf-mt-2">
                        <span className="sf-flex sf-items-center sf-gap-1">
                          <Clock size={12} />
                          {formatDuration(s.duration_minutes)}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }}>
                          {formatMoney(s.price, business.currency)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 1: Choose Staff */}
            {step === 1 && (
              <div className="sf-flex-col sf-gap-3">
                <div>
                  <h2 style={{ fontSize: 'var(--sf-fs-lg)', fontWeight: 700, color: 'var(--cd-primary-dark)', marginBottom: 4 }}>
                    Select a practitioner
                  </h2>
                  <p className="sf-muted sf-text-sm">
                    Choose a specific team member or leave open for the earliest available opening.
                  </p>
                </div>

                <button
                  type="button"
                  className={`sf-staff-option ${!staffMemberId ? 'sf-staff-option-selected' : ''}`}
                  onClick={() => handleStaffChange('')}
                >
                  <div className="sf-avatar sf-avatar-lime">
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }}>Earliest available</div>
                    <div className="sf-text-xs sf-muted">Any available team member</div>
                  </div>
                </button>

                {staffLoading ? (
                  <SkeletonRows rows={2} height={56} />
                ) : (
                  staffOptions?.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`sf-staff-option ${staffMemberId === m.id ? 'sf-staff-option-selected' : ''}`}
                      onClick={() => handleStaffChange(m.id)}
                    >
                      <div className="sf-avatar">{initials(m.profile?.full_name || 'S')}</div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }}>{m.profile?.full_name}</div>
                        <div className="sf-text-xs sf-muted" style={{ textTransform: 'capitalize' }}>{m.role}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Step 2: Choose Date & Time */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 'var(--sf-fs-lg)', fontWeight: 700, color: 'var(--cd-primary-dark)', marginBottom: 4 }}>
                  Select date and time
                </h2>
                <p className="sf-muted sf-text-sm sf-mb-4">
                  All times shown in {business.timezone || 'local business time'}.
                </p>

                {/* Date Strip */}
                <div className="sf-date-strip sf-mb-4">
                  {dateOptions.map((d) => (
                    <button
                      key={d.toISOString()}
                      type="button"
                      className={`sf-date-chip ${isSameDay(d, date) ? 'sf-date-chip-selected' : ''}`}
                      onClick={() => handleDateChange(d)}
                    >
                      <span>{formatDate(d, 'EEE')}</span>
                      <span style={{ fontSize: 'var(--sf-fs-md)' }}>{formatDate(d, 'd')}</span>
                    </button>
                  ))}
                </div>

                {slotsLoading ? (
                  <SkeletonRows rows={2} height={42} />
                ) : !slots?.length ? (
                  <EmptyState
                    title="No available openings"
                    description="No slots remain for this date. Please choose another date on the calendar above."
                  />
                ) : (
                  <div>
                    <div style={{ fontSize: 'var(--sf-fs-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cd-secondary-text)', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Available Openings ({slots.length})
                    </div>
                    <div className="sf-slot-grid">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                        return (
                          <button
                            key={slot.start.toISOString() + slot.staffMemberId}
                            type="button"
                            className={`sf-slot-btn ${isSelected ? 'sf-slot-btn-selected' : ''}`}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {formatTime(slot.start)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Customer Details */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 'var(--sf-fs-lg)', fontWeight: 700, color: 'var(--cd-primary-dark)', marginBottom: 4 }}>
                  Your details
                </h2>
                <p className="sf-muted sf-text-sm sf-mb-4">
                  We'll send your confirmation code and booking details here.
                </p>

                <form id="booking-details-form" onSubmit={handleSubmit(next)} noValidate>
                  <Field label="Full name" required error={errors.fullName?.message} htmlFor="fullName">
                    <Input id="fullName" placeholder="Jane Doe" error={!!errors.fullName} {...register('fullName')} />
                  </Field>

                  <Field label="Email address" required error={errors.email?.message} htmlFor="email">
                    <Input id="email" type="email" placeholder="jane@example.com" error={!!errors.email} {...register('email')} />
                  </Field>

                  <Field label="Phone number" required error={errors.phone?.message} htmlFor="phone">
                    <Input id="phone" type="tel" placeholder="+1 555 0100" error={!!errors.phone} {...register('phone')} />
                  </Field>

                  <Field label="Booking notes (optional)" error={errors.note?.message} htmlFor="note">
                    <Textarea id="note" rows={3} placeholder="Any specific requests or requirements" {...register('note')} />
                  </Field>
                </form>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {step === 4 && (
              <div>
                <h2 style={{ fontSize: 'var(--sf-fs-lg)', fontWeight: 700, color: 'var(--cd-primary-dark)', marginBottom: 4 }}>
                  Review and confirm
                </h2>
                <p className="sf-muted sf-text-sm sf-mb-4">
                  Please review your reservation before confirming.
                </p>

                <div className="sf-booking-summary">
                  <div className="sf-flex sf-justify-between sf-mb-2">
                    <span className="sf-muted">Service</span>
                    <strong>{service?.name}</strong>
                  </div>
                  <div className="sf-flex sf-justify-between sf-mb-2">
                    <span className="sf-muted">Scheduled date & time</span>
                    <strong>
                      {selectedSlot && `${formatDate(selectedSlot.start, 'EEEE, MMM d, yyyy')} · ${formatTime(selectedSlot.start)}`}
                    </strong>
                  </div>
                  <div className="sf-flex sf-justify-between sf-mb-2">
                    <span className="sf-muted">Duration</span>
                    <strong>{service && formatDuration(service.duration_minutes)}</strong>
                  </div>
                  <div className="sf-flex sf-justify-between">
                    <span className="sf-muted">Total fee</span>
                    <strong style={{ fontSize: 'var(--sf-fs-md)', color: 'var(--cd-primary-dark)' }}>
                      {service && formatMoney(service.price, business.currency)}
                    </strong>
                  </div>
                </div>

                <div className="sf-notice sf-notice-info sf-mt-4">
                  <Calendar size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong>Conflict-free guarantee</strong>
                    <div className="sf-text-xs">
                      This time slot is locked exclusively for you upon confirmation.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="sf-flex sf-justify-between sf-mt-6" style={{ borderTop: '1px solid var(--cd-border)', paddingTop: '1.25rem' }}>
              <Button variant="secondary" onClick={back} disabled={step === 0}>
                Back
              </Button>

              {step < 3 && (
                <Button variant="primary" onClick={next} disabled={!canProceed[step]}>
                  Continue <ArrowRight size={16} />
                </Button>
              )}

              {step === 3 && (
                <Button variant="primary" type="submit" form="booking-details-form">
                  Review booking <ArrowRight size={16} />
                </Button>
              )}

              {step === 4 && (
                <Button
                  className="sf-btn-lime"
                  loading={createBooking.isPending}
                  onClick={handleSubmit(onConfirm)}
                >
                  <CheckCircle2 size={16} />
                  Confirm booking
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
