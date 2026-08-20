import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Field, Input } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../features/auth/AuthContext';
import { resetPasswordSchema } from '../../schemas/auth';
import { toFriendlyError } from '../../utils/errorMessages';
import { useToast } from '../../components/common/Toast';
import './auth.css';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await updatePassword({ password: values.password });
      toast.success('Password updated. Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sf-auth-wrap">
      <div className="sf-auth-card">
        <Link to="/" className="sf-auth-logo"><CalendarCheck2 size={24} />ServiceFlow</Link>
        <Card padded>
          <h1 className="sf-auth-title">Choose a new password</h1>
          <p className="sf-auth-sub">Make it at least 8 characters</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="New password" required error={errors.password?.message} htmlFor="password">
              <Input id="password" type="password" autoComplete="new-password" error={!!errors.password} {...register('password')} />
            </Field>
            <Field label="Confirm password" required error={errors.confirmPassword?.message} htmlFor="confirmPassword">
              <Input id="confirmPassword" type="password" autoComplete="new-password" error={!!errors.confirmPassword} {...register('confirmPassword')} />
            </Field>
            <Button type="submit" variant="primary" block loading={submitting}>Update password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
