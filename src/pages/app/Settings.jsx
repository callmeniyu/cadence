import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardBody } from '../../components/common/Card';
import { Field, Input, Select } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useAuth } from '../../features/auth/AuthContext';
import { businessApi, profileApi } from '../../services';
import { useQueryClient } from '@tanstack/react-query';
import { businessSettingsSchema, bookingSettingsSchema, profileSettingsSchema } from '../../schemas/businessSettings';
import { BUSINESS_TYPES, CURRENCIES } from '../../constants/status';
import { toFriendlyError } from '../../utils/errorMessages';
import './app-pages.css';

const TABS = ['Business', 'Booking rules', 'Profile'];
const TIMEZONES = ['UTC', 'Africa/Cairo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Riyadh'];

export default function Settings() {
  const [tab, setTab] = useState('Business');
  const { currentBusiness, reload } = useBusiness();
  const { profile, refreshProfile, user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const bizForm = useForm({
    resolver: zodResolver(businessSettingsSchema),
    values: currentBusiness ? {
      name: currentBusiness.name, businessType: currentBusiness.business_type, phone: currentBusiness.phone || '',
      email: currentBusiness.email || '', address: currentBusiness.address || '', timezone: currentBusiness.timezone,
      currency: currentBusiness.currency, brandColor: currentBusiness.brand_color,
    } : undefined,
  });

  const bookingForm = useForm({
    resolver: zodResolver(bookingSettingsSchema),
    values: currentBusiness ? {
      bookingLeadTimeMinutes: currentBusiness.booking_lead_time_minutes, cancellationWindowHours: currentBusiness.cancellation_window_hours,
      slotIntervalMinutes: currentBusiness.slot_interval_minutes, requiresApproval: currentBusiness.requires_approval,
      customerCanChooseStaff: currentBusiness.customer_can_choose_staff, taxRatePercent: currentBusiness.tax_rate_percent,
      invoiceDueDays: currentBusiness.invoice_due_days,
    } : undefined,
  });

  const profileForm = useForm({
    resolver: zodResolver(profileSettingsSchema),
    values: profile ? { fullName: profile.full_name || '', phone: profile.phone || '' } : undefined,
  });

  async function saveBusiness(values) {
    try {
      await businessApi.updateBusiness(currentBusiness.id, {
        name: values.name, business_type: values.businessType, phone: values.phone, email: values.email,
        address: values.address, timezone: values.timezone, currency: values.currency, brand_color: values.brandColor,
      });
      await reload();
      toast.success('Business settings saved');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function saveBooking(values) {
    try {
      await businessApi.updateBusiness(currentBusiness.id, {
        booking_lead_time_minutes: values.bookingLeadTimeMinutes, cancellation_window_hours: values.cancellationWindowHours,
        slot_interval_minutes: values.slotIntervalMinutes, requires_approval: values.requiresApproval,
        customer_can_choose_staff: values.customerCanChooseStaff, tax_rate_percent: values.taxRatePercent,
        invoice_due_days: values.invoiceDueDays,
      });
      await reload();
      toast.success('Booking rules saved');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function saveProfile(values) {
    try {
      await profileApi.updateProfile(user.id, { full_name: values.fullName, phone: values.phone });
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['members'] });
      toast.success('Profile saved');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Settings</h1>
          <p className="sf-muted">Manage your workspace and account.</p>
        </div>
      </div>

      <div className="sf-tabs">
        {TABS.map((t) => (
          <button key={t} className={`sf-tab ${tab === t ? 'sf-tab-active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="sf-settings-tabs-panel">
        {tab === 'Business' && (
          <Card padded style={{ maxWidth: 560 }}>
            <form onSubmit={bizForm.handleSubmit(saveBusiness)} noValidate>
              <Field label="Business name" required error={bizForm.formState.errors.name?.message} htmlFor="name">
                <Input id="name" error={!!bizForm.formState.errors.name} {...bizForm.register('name')} />
              </Field>
              <Field label="Business type" required htmlFor="businessType">
                <Select id="businessType" {...bizForm.register('businessType')}>
                  {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </Field>
              <div className="sf-grid-2">
                <Field label="Phone" htmlFor="phone"><Input id="phone" {...bizForm.register('phone')} /></Field>
                <Field label="Email" error={bizForm.formState.errors.email?.message} htmlFor="email"><Input id="email" type="email" {...bizForm.register('email')} /></Field>
              </div>
              <Field label="Address" htmlFor="address"><Input id="address" {...bizForm.register('address')} /></Field>
              <div className="sf-grid-2">
                <Field label="Timezone" htmlFor="timezone">
                  <Select id="timezone" {...bizForm.register('timezone')}>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </Select>
                </Field>
                <Field label="Currency" htmlFor="currency">
                  <Select id="currency" {...bizForm.register('currency')}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Brand color" htmlFor="brandColor">
                <Input id="brandColor" type="color" style={{ height: 42, padding: 4 }} {...bizForm.register('brandColor')} />
              </Field>
              <Button type="submit" variant="primary" loading={bizForm.formState.isSubmitting}>Save changes</Button>
            </form>
          </Card>
        )}

        {tab === 'Booking rules' && (
          <Card padded style={{ maxWidth: 560 }}>
            <form onSubmit={bookingForm.handleSubmit(saveBooking)} noValidate>
              <div className="sf-grid-2">
                <Field label="Lead time (minutes)" hint="Minimum notice before a booking" htmlFor="bookingLeadTimeMinutes">
                  <Input id="bookingLeadTimeMinutes" type="number" {...bookingForm.register('bookingLeadTimeMinutes')} />
                </Field>
                <Field label="Cancellation window (hours)" htmlFor="cancellationWindowHours">
                  <Input id="cancellationWindowHours" type="number" {...bookingForm.register('cancellationWindowHours')} />
                </Field>
              </div>
              <div className="sf-grid-2">
                <Field label="Slot interval (minutes)" htmlFor="slotIntervalMinutes">
                  <Input id="slotIntervalMinutes" type="number" {...bookingForm.register('slotIntervalMinutes')} />
                </Field>
                <Field label="Invoice due (days)" htmlFor="invoiceDueDays">
                  <Input id="invoiceDueDays" type="number" {...bookingForm.register('invoiceDueDays')} />
                </Field>
              </div>
              <Field label="Tax rate (%)" htmlFor="taxRatePercent">
                <Input id="taxRatePercent" type="number" step="0.01" {...bookingForm.register('taxRatePercent')} />
              </Field>
              <div className="sf-flex sf-gap-4 sf-mb-4">
                <label className="sf-checkbox-row"><input type="checkbox" {...bookingForm.register('requiresApproval')} /> Require approval for new bookings</label>
              </div>
              <div className="sf-flex sf-gap-4 sf-mb-4">
                <label className="sf-checkbox-row"><input type="checkbox" {...bookingForm.register('customerCanChooseStaff')} /> Let customers choose staff</label>
              </div>
              <Button type="submit" variant="primary" loading={bookingForm.formState.isSubmitting}>Save changes</Button>
            </form>
          </Card>
        )}

        {tab === 'Profile' && (
          <Card padded style={{ maxWidth: 480 }}>
            <form onSubmit={profileForm.handleSubmit(saveProfile)} noValidate>
              <Field label="Full name" required error={profileForm.formState.errors.fullName?.message} htmlFor="fullName">
                <Input id="fullName" error={!!profileForm.formState.errors.fullName} {...profileForm.register('fullName')} />
              </Field>
              <Field label="Phone" htmlFor="phone">
                <Input id="phone" {...profileForm.register('phone')} />
              </Field>
              <Button type="submit" variant="primary" loading={profileForm.formState.isSubmitting}>Save profile</Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
