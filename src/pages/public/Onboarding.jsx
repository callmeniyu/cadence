import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../../components/common/Card';
import { Field, Input, Select } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { CadenceLogo } from '../../components/common/CadenceLogo';
import { useToast } from '../../components/common/Toast';
import { businessBasicsSchema } from '../../schemas/onboarding';
import { useCreateWorkspace } from '../../features/onboarding/hooks';
import { slugify, isValidSlug } from '../../utils/slug';
import { toFriendlyError } from '../../utils/errorMessages';
import { BUSINESS_TYPES, CURRENCIES } from '../../constants/status';
import './auth.css';

const TIMEZONES = ['UTC', 'Africa/Cairo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Riyadh'];

export default function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const createWorkspace = useCreateWorkspace();
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugValue, setSlugValue] = useState('');

  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(businessBasicsSchema),
    defaultValues: { businessType: 'other', timezone: 'UTC', currency: 'USD' },
  });

  const businessName = useWatch({ control, name: 'name' });
  const derivedSlug = slugEdited ? slugValue : slugify(businessName || '');

  async function onSubmit(values) {
    const finalSlug = derivedSlug;
    if (!isValidSlug(finalSlug)) {
      toast.error('Please choose a valid business URL (lowercase letters, numbers, hyphens).');
      return;
    }
    try {
      await createWorkspace.mutateAsync({ ...values, slug: finalSlug });
      toast.success('Cadence workspace created!');
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div className="sf-auth-wrap">
      <div className="sf-auth-card" style={{ maxWidth: 500 }}>
        <div className="sf-auth-logo">
          <CadenceLogo tone="light" size="lg" />
        </div>

        <Card padded>
          <h1 className="sf-auth-title">Configure your workspace</h1>
          <p className="sf-auth-sub">Tell us about your business to get started with Cadence</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Business name" required error={errors.name?.message} htmlFor="name">
              <Input id="name" placeholder="e.g. Apex Health & Performance" error={!!errors.name} {...register('name')} />
            </Field>

            <Field label="Cadence booking URL" hint={`cadence.app/b/${derivedSlug || 'your-business'}`}>
              <Input
                value={derivedSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlugValue(slugify(e.target.value));
                }}
                placeholder="your-business-url"
              />
            </Field>

            <Field label="Business type" required error={errors.businessType?.message} htmlFor="businessType">
              <Select id="businessType" error={!!errors.businessType} {...register('businessType')}>
                {BUSINESS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </Field>

            <div className="sf-grid-2">
              <Field label="Phone" error={errors.phone?.message} htmlFor="phone">
                <Input id="phone" placeholder="+1 555 0199" {...register('phone')} />
              </Field>
              <Field label="Contact email" error={errors.email?.message} htmlFor="email">
                <Input id="email" type="email" placeholder="contact@business.com" {...register('email')} />
              </Field>
            </div>

            <Field label="Physical address" error={errors.address?.message} htmlFor="address">
              <Input id="address" placeholder="100 Main Street, Suite 400" {...register('address')} />
            </Field>

            <div className="sf-grid-2">
              <Field label="Timezone" required error={errors.timezone?.message} htmlFor="timezone">
                <Select id="timezone" error={!!errors.timezone} {...register('timezone')}>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </Select>
              </Field>
              <Field label="Currency" required error={errors.currency?.message} htmlFor="currency">
                <Select id="currency" error={!!errors.currency} {...register('currency')}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
            </div>

            <Button type="submit" variant="primary" block loading={isSubmitting} className="sf-mt-4">
              Launch Cadence Workspace
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
