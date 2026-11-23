import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Users,
  CreditCard,
  BarChart3,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Building,
  HeartPulse,
  Dumbbell,
  Briefcase,
  Wrench,
  Scissors,
} from 'lucide-react';
import { PublicHeader, PublicFooter } from '../../components/layout/PublicHeader';
import { Button } from '../../components/common/Button';
import { CadenceMark } from '../../components/common/CadenceLogo';
import './landing.css';

const SECTORS = [
  { icon: HeartPulse, label: 'Clinics & Wellness' },
  { icon: Scissors, label: 'Salons & Beauty' },
  { icon: Dumbbell, label: 'Gyms & Studios' },
  { icon: Building, label: 'Training Centers' },
  { icon: Briefcase, label: 'Consultants' },
  { icon: Wrench, label: 'Repair & Service' },
];

const FEATURES = [
  {
    icon: CalendarClock,
    title: 'Rhythmic Scheduling',
    desc: 'Intelligent conflict-free slot engine calculating working hours, buffers, lead times, and staff assignments in real-time.',
  },
  {
    icon: Users,
    title: 'Customer Directory',
    desc: 'Unified profiles tracking visit histories, preferred services, notes, and lifetime financial transactions.',
  },
  {
    icon: CreditCard,
    title: 'Billing & Invoices',
    desc: 'Generate branded, itemized invoices directly from bookings. Record and simulate payments with zero external gateways.',
  },
  {
    icon: BarChart3,
    title: 'Operational Analytics',
    desc: 'Real-time metrics, 30-day revenue trends, staff utilization, and status breakdowns calculated from local records.',
  },
  {
    icon: ShieldCheck,
    title: 'Local-First Architecture',
    desc: 'Completely private, instantaneous browser-backed database. No external tracking, no backend dependencies, zero latency.',
  },
  {
    icon: Smartphone,
    title: 'Command Everywhere',
    desc: 'Designed for front desks, mobile consultation tablets, and office laptops with fluid responsive layouts.',
  },
];

export default function Landing() {
  return (
    <div className="sf-flex-col" style={{ minHeight: '100vh', background: 'var(--cd-bg)' }}>
      <PublicHeader />

      <main style={{ flex: 1 }}>
        {/* Editorial Hero */}
        <section className="sf-hero">
          <div className="sf-container sf-hero-inner">
            <div className="sf-hero-pill">
              <span className="sf-hero-pill-dot" />
              <span>Cadence Platform &middot; Run your business in rhythm</span>
            </div>

            <h1 className="sf-hero-title">
              Run your appointment business <span>in perfect rhythm.</span>
            </h1>

            <p className="sf-hero-sub">
              A high-precision scheduling and operations platform for modern appointment-based businesses.
              Conflict-free bookings, customer records, and instant invoicing &mdash; entirely local, reliable, and portfolio-ready.
            </p>

            <div className="sf-flex sf-gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/b/nova-wellness-studio">
                <Button size="lg" className="sf-btn-lime">
                  <Sparkles size={18} />
                  Explore Demo Studio
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary">
                  Open Command Center
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>

            {/* Targeted Sectors Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '1.25rem',
                marginTop: '3.5rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--cd-border)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--cd-secondary-text)', letterSpacing: '0.05em' }}>
                Built for
              </span>
              {SECTORS.map((s) => (
                <div
                  key={s.label}
                  className="sf-flex sf-items-center sf-gap-2"
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--cd-primary-text)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: 999,
                    background: 'var(--cd-surface)',
                    border: '1px solid var(--cd-border)',
                  }}
                >
                  <s.icon size={14} style={{ color: 'var(--cd-accent-violet)' }} />
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="sf-container" style={{ padding: '4.5rem 0 3rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 3rem' }}>
            <h2 style={{ fontSize: 'var(--sf-fs-2xl)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--cd-primary-dark)' }}>
              Engineered for complete operational clarity
            </h2>
            <p className="sf-muted sf-mt-2" style={{ fontSize: 'var(--sf-fs-md)' }}>
              Everything your team needs to schedule clients, manage staff availability, and track revenue.
            </p>
          </div>

          <div className="sf-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="cd-feature-card">
                <div className="cd-feature-icon-wrap">
                  <f.icon size={22} />
                </div>
                <h3 style={{ fontSize: 'var(--sf-fs-md)', fontWeight: 700, color: 'var(--cd-primary-dark)' }}>
                  {f.title}
                </h3>
                <p className="sf-muted sf-text-sm sf-mt-2">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Command Center Rhythm Banner */}
        <section className="sf-container" style={{ padding: '1rem 0 4rem' }}>
          <div className="cd-rhythm-banner sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ maxWidth: 540 }}>
              <div className="sf-flex sf-items-center sf-gap-2 sf-mb-3">
                <CadenceMark size={24} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--cd-accent-lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Zero-Latency Local Storage
                </span>
              </div>
              <h2 style={{ fontSize: 'var(--sf-fs-2xl)', color: '#FFFFFF', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                Ready to run your business in cadence?
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.75rem', fontSize: 'var(--sf-fs-md)' }}>
                Try our pre-seeded Nova Wellness Studio demonstration workspace with sample staff, bookings, and financial records.
              </p>
              <div className="sf-flex sf-gap-3 sf-mt-4" style={{ flexWrap: 'wrap' }}>
                <div className="sf-flex sf-items-center sf-gap-2" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle2 size={16} color="var(--cd-accent-lime)" />
                  <span>Double-booking guarantee</span>
                </div>
                <div className="sf-flex sf-items-center sf-gap-2" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle2 size={16} color="var(--cd-accent-lime)" />
                  <span>Instant data reset</span>
                </div>
                <div className="sf-flex sf-items-center sf-gap-2" style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle2 size={16} color="var(--cd-accent-lime)" />
                  <span>JSON Export / Import</span>
                </div>
              </div>
            </div>

            <div className="sf-flex sf-gap-3" style={{ flexWrap: 'wrap' }}>
              <Link to="/b/nova-wellness-studio">
                <Button size="lg" className="sf-btn-lime">
                  Book an appointment
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.2)' }}>
                  Sign in as Owner
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
