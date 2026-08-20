import { useState } from 'react';
import { addDays, isSameDay } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, Input, Select } from '../../../components/common/FormField';
import { Button } from '../../../components/common/Button';
import { useToast } from '../../../components/common/Toast';
import { useBusiness } from '../../../features/business/BusinessContext';
import { useAuth } from '../../../features/auth/AuthContext';
import { useServices } from '../../../features/services/hooks';
import { useStaffList } from '../../../features/staff/hooks';
import { useSlots, useCreateAdminBooking } from '../../../features/booking/hooks';
import { formatDate, formatTime, formatMoney, formatDuration } from '../../../utils/format';
import { toFriendlyError } from '../../../utils/errorMessages';

const customerSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().min(5, 'Enter a valid phone'),
  note: z.string().optional(),
});

export default function NewAppointmentForm({ onDone, prefillCustomer }) {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const toast = useToast();
  const { data: services } = useServices(currentBusiness?.id, { activeOnly: true });
  const { data: staffList } = useStaffList(currentBusiness?.id);

  const [serviceId, setServiceId] = useState('');
  const [staffMemberId, setStaffMemberId] = useState('');
  const [date, setDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);

  const { data: slots, isLoading: slotsLoading } = useSlots({ businessId: currentBusiness?.id, serviceId, staffMemberId: staffMemberId || undefined, date });
  const createAdminBooking = useCreateAdminBooking();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: prefillCustomer || {},
  });

  const dateOptions = Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));

  async function onSubmit(values) {
    if (!selectedSlot) { toast.error('Please choose a time slot.'); return; }
    try {
      await createAdminBooking.mutateAsync({
        businessId: currentBusiness.id, serviceId,
        staffMemberId: selectedSlot.staffMemberId || staffMemberId || null,
        startAt: selectedSlot.start.toISOString(),
        customer: { fullName: values.fullName, email: values.email, phone: values.phone },
        customerNote: values.note,
        createdBy: user?.id,
      });
      toast.success('Appointment created');
      onDone?.();
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field label="Service" required htmlFor="service">
        <Select id="service" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSelectedSlot(null); }}>
          <option value="">Choose a service</option>
          {services?.map((s) => <option key={s.id} value={s.id}>{s.name} &middot; {formatDuration(s.duration_minutes)} &middot; {formatMoney(s.price, currentBusiness?.currency)}</option>)}
        </Select>
      </Field>

      <Field label="Staff (optional)" htmlFor="staff">
        <Select id="staff" value={staffMemberId} onChange={(e) => { setStaffMemberId(e.target.value); setSelectedSlot(null); }}>
          <option value="">Any available</option>
          {staffList?.map((m) => <option key={m.id} value={m.id}>{m.profile?.full_name}</option>)}
        </Select>
      </Field>

      {serviceId && (
        <div className="sf-field">
          <span className="sf-label">Date &amp; time</span>
          <div className="sf-date-strip sf-mt-2 sf-mb-3">
            {dateOptions.map((d) => (
              <button key={d.toISOString()} type="button" className={`sf-date-chip ${isSameDay(d, date) ? 'sf-date-chip-selected' : ''}`} onClick={() => { setDate(d); setSelectedSlot(null); }}>
                <span>{formatDate(d, 'EEE')}</span><span style={{ fontSize: 'var(--sf-fs-md)' }}>{formatDate(d, 'd')}</span>
              </button>
            ))}
          </div>
          {slotsLoading ? <p className="sf-muted sf-text-sm">Loading times...</p> : !slots?.length ? (
            <p className="sf-muted sf-text-sm">No times available for this date.</p>
          ) : (
            <div className="sf-slot-grid">
              {slots.map((slot) => (
                <button key={slot.start.toISOString() + slot.staffMemberId} type="button"
                  className={`sf-slot-btn ${selectedSlot?.start.getTime() === slot.start.getTime() ? 'sf-slot-btn-selected' : ''}`}
                  onClick={() => setSelectedSlot(slot)}>
                  {formatTime(slot.start)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="sf-grid-2 sf-mt-4">
        <Field label="Customer name" required error={errors.fullName?.message} htmlFor="fullName">
          <Input id="fullName" error={!!errors.fullName} {...register('fullName')} />
        </Field>
        <Field label="Email" required error={errors.email?.message} htmlFor="email">
          <Input id="email" type="email" error={!!errors.email} {...register('email')} />
        </Field>
      </div>
      <Field label="Phone" required error={errors.phone?.message} htmlFor="phone">
        <Input id="phone" error={!!errors.phone} {...register('phone')} />
      </Field>

      <Button type="submit" variant="primary" block loading={createAdminBooking.isPending}>Create appointment</Button>
    </form>
  );
}
