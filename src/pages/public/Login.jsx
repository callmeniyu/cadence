import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Field, Input } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { CadenceLogo } from '../../components/common/CadenceLogo';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../features/auth/AuthContext';
import { loginSchema } from '../../schemas/auth';
import { toFriendlyError } from '../../utils/errorMessages';
import './auth.css';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await signIn(values);
      toast.success('Welcome back to Cadence!');
      navigate(location.state?.from?.pathname || '/app', { replace: true });
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(role) {
    const email = {
      owner: 'owner@novawellness.demo',
      admin: 'admin@novawellness.demo',
      staff1: 'staff1@novawellness.demo',
      staff2: 'staff2@novawellness.demo',
      customer: 'customer@novawellness.demo',
    }[role];
    setValue('email', email);
    setValue('password', 'demo1234');
  }

  return (
    <div className="sf-auth-wrap">
      <div className="sf-auth-card">
        <Link to="/" className="sf-auth-logo">
          <CadenceLogo tone="light" size="lg" />
        </Link>

        <Card padded>
          <h1 className="sf-auth-title">Sign in</h1>
          <p className="sf-auth-sub">Welcome back to your Cadence workspace</p>

          <div className="sf-demo-hint">
            <div className="sf-flex sf-items-center sf-gap-1 sf-mb-2" style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }}>
              <Sparkles size={14} color="var(--cd-accent-violet)" />
              <span>Demonstration Accounts (Password: demo1234)</span>
            </div>
            <div className="sf-chip-row">
              <button type="button" className="sf-chip" onClick={() => fillDemo('owner')}>Owner</button>
              <button type="button" className="sf-chip" onClick={() => fillDemo('admin')}>Admin</button>
              <button type="button" className="sf-chip" onClick={() => fillDemo('staff1')}>Staff 1</button>
              <button type="button" className="sf-chip" onClick={() => fillDemo('staff2')}>Staff 2</button>
              <button type="button" className="sf-chip" onClick={() => fillDemo('customer')}>Customer</button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Email" required error={errors.email?.message} htmlFor="email">
              <Input id="email" type="email" autoComplete="email" error={!!errors.email} {...register('email')} />
            </Field>

            <Field label="Password" required error={errors.password?.message} htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" error={!!errors.password} {...register('password')} />
            </Field>

            <div className="sf-flex sf-justify-between sf-items-center sf-mb-4">
              <div className="sf-flex sf-items-center sf-gap-1 sf-text-xs sf-muted">
                <ShieldCheck size={13} color="var(--cd-success)" />
                <span>Local browser session</span>
              </div>
              <Link to="/forgot-password" className="sf-text-sm" style={{ color: 'var(--cd-primary-dark)', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" block loading={submitting}>
              Sign in to Cadence
            </Button>
          </form>
        </Card>

        <p className="sf-auth-foot">
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
