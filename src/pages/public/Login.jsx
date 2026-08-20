import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarCheck2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Field, Input } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../features/auth/AuthContext';
import { loginSchema } from '../../schemas/auth';
import { toFriendlyError } from '../../utils/errorMessages';
import { DEMO_MODE } from '../../services';
import './auth.css';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      await signIn(values);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/app', { replace: true });
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(role) {
    const email = { owner: 'owner@novawellness.demo', admin: 'admin@novawellness.demo', staff: 'staff1@novawellness.demo', customer: 'customer@novawellness.demo' }[role];
    setValue('email', email);
    setValue('password', 'demo1234');
  }

  return (
    <div className="sf-auth-wrap">
      <div className="sf-auth-card">
        <Link to="/" className="sf-auth-logo"><CalendarCheck2 size={24} />ServiceFlow</Link>
        <Card padded>
          <h1 className="sf-auth-title">Sign in</h1>
          <p className="sf-auth-sub">Welcome back to your workspace</p>

          {DEMO_MODE && (
            <div className="sf-demo-hint">
              <strong>Demo mode.</strong> Try an account:{' '}
              <button type="button" className="sf-chip" style={{ border: 'none', cursor: 'pointer' }} onClick={() => fillDemo('owner')}>Owner</button>{' '}
              <button type="button" className="sf-chip" style={{ border: 'none', cursor: 'pointer' }} onClick={() => fillDemo('admin')}>Admin</button>{' '}
              <button type="button" className="sf-chip" style={{ border: 'none', cursor: 'pointer' }} onClick={() => fillDemo('staff')}>Staff</button>{' '}
              <button type="button" className="sf-chip" style={{ border: 'none', cursor: 'pointer' }} onClick={() => fillDemo('customer')}>Customer</button>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Field label="Email" required error={errors.email?.message} htmlFor="email">
              <Input id="email" type="email" autoComplete="email" error={!!errors.email} {...register('email')} />
            </Field>
            <Field label="Password" required error={errors.password?.message} htmlFor="password">
              <Input id="password" type="password" autoComplete="current-password" error={!!errors.password} {...register('password')} />
            </Field>
            <div className="sf-flex sf-justify-between sf-items-center sf-mb-4">
              <Link to="/forgot-password" className="sf-text-sm" style={{ color: 'var(--sf-brand-600)', fontWeight: 600 }}>Forgot password?</Link>
            </div>
            <Button type="submit" variant="primary" block loading={submitting}>Sign in</Button>
          </form>
        </Card>
        <p className="sf-auth-foot">
          Don't have an account? <Link to="/register" style={{ color: 'var(--sf-brand-600)', fontWeight: 700 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}
