import { Link } from 'react-router-dom';
import { CalendarClock, Users, CreditCard, BarChart3, ShieldCheck, Smartphone } from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { DEMO_MODE } from '../../services';
import './landing.css';

const FEATURES = [
  { icon: CalendarClock, title: 'Smart scheduling', desc: 'Automatic conflict-free booking with staff availability, buffers, and lead times built in.' },
  { icon: Users, title: 'Customer records', desc: 'A full history of appointments, notes, and payments for every customer.' },
  { icon: CreditCard, title: 'Invoicing & payments', desc: 'Generate invoices from appointments and track payments by method.' },
  { icon: BarChart3, title: 'Reporting', desc: 'Revenue, bookings, staff workload, and completion rates at a glance.' },
  { icon: ShieldCheck, title: 'Secure by design', desc: 'Role-based access and database-level security keep every workspace isolated.' },
  { icon: Smartphone, title: 'Works everywhere', desc: 'A responsive interface that works from a phone at the front desk or a laptop in the office.' },
];

export default function Landing() {
  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh' }}>
      <PublicHeader />
      <main style={{ flex: 1 }}>
        <section className="sf-hero">
          <div className="sf-container sf-hero-inner">
            <h1 className="sf-hero-title">Appointment scheduling that just works</h1>
            <p className="sf-hero-sub">
              ServiceFlow helps clinics, salons, gyms, and consultants manage bookings, staff, customers,
              and payments — all in one place, with no double-bookings, ever.
            </p>
            <div className="sf-flex sf-gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register"><Button size="lg" variant="primary">Start free</Button></Link>
              <Link to="/b/nova-wellness-studio"><Button size="lg" variant="secondary">View a live demo business</Button></Link>
            </div>
            {DEMO_MODE && <p className="sf-text-xs sf-muted sf-mt-4">Running in demo mode — no real backend required to try it out.</p>}
          </div>
        </section>

        <section className="sf-container" style={{ padding: '3rem 0' }}>
          <div className="sf-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {FEATURES.map((f) => (
              <Card key={f.title} padded>
                <f.icon size={26} color="var(--sf-brand-500)" />
                <h3 className="sf-mt-2" style={{ fontSize: 'var(--sf-fs-md)' }}>{f.title}</h3>
                <p className="sf-muted sf-text-sm sf-mt-2">{f.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="sf-container" style={{ padding: '2rem 0 4rem' }}>
          <Card padded className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: 'var(--sf-fs-lg)' }}>Ready to get organized?</h2>
              <p className="sf-muted">Create a workspace for your business in under two minutes.</p>
            </div>
            <Link to="/register"><Button variant="primary" size="lg">Create your workspace</Button></Link>
          </Card>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
