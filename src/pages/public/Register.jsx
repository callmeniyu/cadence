import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../../components/common/Card';
import { Field, Input } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { CadenceLogo } from '../../components/common/CadenceLogo';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../features/auth/AuthContext';
import { registerSchema } from '../../schemas/auth';
import { toFriendlyError } from '../../utils/errorMessages';
import './auth.css';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await signUp({ email: values.email, password: values.password, fullName: values.fullName });
      toast.success('Account created! Let\'s configure your Cadence workspace.');
      navigate('/onboarding', { replace: true });
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
          <h1 className="sf-auth-title">Create your account</h1>
          <p className="sf-auth-sub">Set up your local workspace on Cadence</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Full name" required error={errors.fullName?.message} htmlFor="fullName">
              <Input id="fullName" autoComplete="name" error={!!errors.fullName} {...register('fullName')} />
            </Field>

            <Field label="Email address" required error={errors.email?.message} htmlFor="email">
              <Input id="email" type="email" autoComplete="email" error={!!errors.email} {...register('email')} />
            </Field>

            <Field label="Password" required error={errors.password?.message} htmlFor="password" hint="At least 8 characters">
              <Input id="password" type="password" autoComplete="new-password" error={!!errors.password} {...register('password')} />
            </Field>

            <Field label="Confirm password" required error={errors.confirmPassword?.message} htmlFor="confirmPassword">
              <Input id="confirmPassword" type="password" autoComplete="new-password" error={!!errors.confirmPassword} {...register('confirmPassword')} />
            </Field>

            <Button type="submit" variant="primary" block loading={submitting}>
              Create account & workspace
            </Button>
          </form>
        </Card>

        <p className="sf-auth-foot">
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
