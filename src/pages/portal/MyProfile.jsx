import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../../components/common/Card';
import { Field, Input } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../features/auth/AuthContext';
import { profileApi } from '../../services';
import { profileSettingsSchema } from '../../schemas/businessSettings';
import { toFriendlyError } from '../../utils/errorMessages';

export default function MyProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSettingsSchema),
    values: profile ? { fullName: profile.full_name || '', phone: profile.phone || '' } : undefined,
  });

  async function onSubmit(values) {
    try {
      await profileApi.updateProfile(user.id, { full_name: values.fullName, phone: values.phone });
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <h1 className="sf-app-page-title sf-mb-4">My profile</h1>
      <Card padded style={{ maxWidth: 440 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Full name" required error={errors.fullName?.message} htmlFor="fullName">
            <Input id="fullName" error={!!errors.fullName} {...register('fullName')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message} htmlFor="phone">
            <Input id="phone" {...register('phone')} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" value={user?.email || ''} disabled />
          </Field>
          <Button type="submit" variant="primary" loading={isSubmitting}>Save changes</Button>
        </form>
      </Card>
    </div>
  );
}
