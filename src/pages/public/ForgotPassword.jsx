import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Field, Input } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { CadenceLogo } from '../../components/common/CadenceLogo';
import { useAuth } from '../../features/auth/AuthContext';
import { forgotPasswordSchema } from '../../schemas/auth';
import { toFriendlyError } from '../../utils/errorMessages';
import { useToast } from '../../components/common/Toast';
import './auth.css';

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuth();
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await resetPasswordForEmail(values.email);
      setSent(true);
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="sf-auth-wrap">
      <div className="sf-auth-card">
        <Link to="/" className="sf-auth-logo">
          <CadenceLogo tone="light" size="lg" />
        </Link>

        <Card padded>
          {sent ? (
            <div className="sf-empty">
              <MailCheck size={44} color="var(--cd-success)" />
              <div className="sf-empty-title">Check your email</div>
              <p className="sf-muted">
                Since this is a client-side demo, you can directly sign in using any of the seeded demonstration accounts.
              </p>
              <Link to="/login" className="sf-mt-4">
                <Button variant="secondary">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="sf-auth-title">Reset your password</h1>
              <p className="sf-auth-sub">Enter your email to receive a password reset link</p>

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Field label="Email" required error={errors.email?.message} htmlFor="email">
                  <Input id="email" type="email" autoComplete="email" error={!!errors.email} {...register('email')} />
                </Field>

                <Button type="submit" variant="primary" block loading={submitting}>
                  Send reset link
                </Button>
              </form>
            </>
          )}
        </Card>

        <p className="sf-auth-foot">
          <Link to="/login" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
