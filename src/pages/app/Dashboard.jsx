import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  CalendarClock,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Plus,
  Users,
  CreditCard,
  CalendarDays,
  ExternalLink,
  Clock,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { SkeletonRows } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { useBusiness } from '../../features/business/BusinessContext';
import { useAuth } from '../../features/auth/AuthContext';
import {
  useDashboardKpis,
  useTodaySchedule,
  useRevenueSeries,
  useStatusBreakdown,
} from '../../features/reports/hooks';
import { usePayments } from '../../features/payments/hooks';
import { formatMoney, formatTime, formatDate, initials } from '../../utils/format';
import { APPOINTMENT_STATUS_META, PAYMENT_METHOD_LABELS } from '../../constants/status';
import NewAppointmentForm from './components/NewAppointmentForm';
import './app-pages.css';

export default function Dashboard() {
  const { currentBusiness, memberships, switchBusiness } = useBusiness();
  const { profile } = useAuth();
  const [showNewAppt, setShowNewAppt] = useState(false);

  const { data: kpis, isLoading: kpiLoading } = useDashboardKpis(currentBusiness?.id);
  const { data: schedule, isLoading: schedLoading } = useTodaySchedule(currentBusiness?.id);
  const { data: revenue, isLoading: revLoading } = useRevenueSeries(currentBusiness?.id, 14);
  const { data: statusBreakdown } = useStatusBreakdown(currentBusiness?.id);
  const { data: recentPayments } = usePayments(currentBusiness?.id, { pageSize: 4 });

  const isDemo = currentBusiness?.slug === 'nova-wellness-studio' || currentBusiness?.name?.toLowerCase().includes('demo');
  const otherWorkspace = memberships.find((m) => m.business.id !== currentBusiness?.id)?.business;
  const hasRevenue = (revenue || []).some((r) => Number(r.revenue) > 0);
  const isEmptyWorkspace = (kpis?.totalBookings ?? 0) === 0 && !hasRevenue;

  // Dynamic greeting based on current local hour
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const userName = profile?.full_name ? profile.full_name.split(' ')[0] : 'there';
  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div>
      {/* Editorial Header Banner */}
      <div className="sf-app-page-header">
        <div>
          <div className="sf-flex sf-items-center sf-gap-2 sf-mb-1">
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'var(--cd-surface)',
                border: '1px solid var(--cd-border)',
                color: 'var(--cd-secondary-text)',
              }}
            >
              Command Center
            </span>
            <span className="sf-text-xs sf-muted">{todayFormatted}</span>
          </div>
          <h1 className="sf-app-page-title" style={{ fontSize: '2.1rem' }}>
            {greeting}, {userName}
          </h1>
          <p className="sf-muted" style={{ fontSize: 'var(--sf-fs-sm)' }}>
            Here is your operational snapshot for <strong>{currentBusiness?.name}</strong>.
          </p>
        </div>

        <div className="sf-flex sf-gap-2" style={{ flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => setShowNewAppt(true)}>
            <Plus size={16} /> New appointment
          </Button>
          {currentBusiness?.slug && (
            <a
              href={`/b/${currentBusiness.slug}`}
              target="_blank"
              rel="noreferrer"
              className="sf-btn sf-btn-secondary sf-flex sf-items-center sf-gap-1"
            >
              <span>Booking Page</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Environment Mode Switcher Bar */}
      <div
        className="sf-flex sf-items-center sf-justify-between sf-p-3 sf-mb-6"
        style={{
          background: 'var(--cd-surface)',
          border: '1px solid var(--cd-border)',
          borderRadius: 'var(--sf-radius-md)',
          boxShadow: 'var(--sf-shadow-sm)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div className="sf-flex sf-items-center sf-gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isDemo ? 'var(--cd-accent-lime)' : 'var(--cd-secondary-accent)',
              display: 'inline-block',
            }}
          />
          <div>
            <div className="sf-flex sf-items-center sf-gap-2">
              <strong style={{ fontSize: 'var(--sf-fs-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cd-primary-dark)' }}>
                {isDemo ? 'Demo Studio Mode (Simulated Data)' : 'Custom Workspace (Your Own Data)'}
              </strong>
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontWeight: 700,
                  background: isDemo ? 'rgba(199, 243, 107, 0.25)' : 'rgba(119, 117, 232, 0.15)',
                  color: isDemo ? 'var(--cd-primary-dark)' : 'var(--cd-secondary-accent)',
                }}
              >
                {isDemo ? 'Mock Data Active' : 'Clean Slate Active'}
              </span>
            </div>
            <p className="sf-muted sf-text-xs sf-mt-1" style={{ margin: '2px 0 0' }}>
              {isDemo
                ? 'Dashboard KPIs, appointment rhythm, and 14-day revenue charts are pre-loaded with demonstration metrics.'
                : 'This workspace is your clean operational slate. Add your own services, staff, and appointments from scratch.'}
            </p>
          </div>
        </div>

        {otherWorkspace && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => switchBusiness(otherWorkspace.id)}
            style={{ fontSize: '0.75rem', fontWeight: 600 }}
          >
            {isDemo ? (
              <>Switch to My Workspace (Your Own Data) &rarr;</>
            ) : (
              <>&larr; Switch to Demo Studio (Mock Data)</>
            )}
          </Button>
        )}
      </div>

      {/* Clean Slate Quick-Start Banner (When Empty) */}
      {isEmptyWorkspace && (
        <Card padded className="sf-mb-6" style={{ background: 'var(--cd-surface)', border: '1.5px dashed var(--cd-border)' }}>
          <div className="sf-flex sf-items-center sf-gap-2 sf-mb-2">
            <Sparkles size={18} style={{ color: 'var(--cd-secondary-accent)' }} />
            <h3 style={{ fontSize: 'var(--sf-fs-md)', fontWeight: 800, color: 'var(--cd-primary-dark)' }}>
              Your Workspace is Ready — Add Your Own Data
            </h3>
          </div>
          <p className="sf-muted sf-text-sm sf-mb-4" style={{ maxWidth: 640 }}>
            You are viewing your clean workspace. Start tailoring your business by creating bookable offerings and team schedules.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <Link to="/app/services" className="cd-quick-action sf-flex-col sf-items-start" style={{ textDecoration: 'none', padding: '1rem' }}>
              <div className="sf-flex sf-items-center sf-gap-2 sf-mb-1" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
                <Scissors size={15} style={{ color: 'var(--cd-secondary-accent)' }} />
                1. Add Services
              </div>
              <span className="sf-muted sf-text-xs">Create treatments, consultations, or classes</span>
            </Link>

            <Link to="/app/staff" className="cd-quick-action sf-flex-col sf-items-start" style={{ textDecoration: 'none', padding: '1rem' }}>
              <div className="sf-flex sf-items-center sf-gap-2 sf-mb-1" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
                <Users size={15} style={{ color: 'var(--cd-secondary-accent)' }} />
                2. Set Working Hours
              </div>
              <span className="sf-muted sf-text-xs">Configure availability schedules & practitioner time</span>
            </Link>

            <button
              type="button"
              className="cd-quick-action sf-flex-col sf-items-start"
              onClick={() => setShowNewAppt(true)}
              style={{ cursor: 'pointer', textAlign: 'left', padding: '1rem', border: '1px solid var(--cd-border)' }}
            >
              <div className="sf-flex sf-items-center sf-gap-2 sf-mb-1" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
                <Plus size={15} style={{ color: 'var(--cd-accent-lime)' }} />
                3. Book an Appointment
              </div>
              <span className="sf-muted sf-text-xs">Record a walk-in or test scheduling</span>
            </button>

            {currentBusiness?.slug && (
              <a
                href={`/b/${currentBusiness.slug}`}
                target="_blank"
                rel="noreferrer"
                className="cd-quick-action sf-flex-col sf-items-start"
                style={{ textDecoration: 'none', padding: '1rem' }}
              >
                <div className="sf-flex sf-items-center sf-gap-2 sf-mb-1" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
                  <ExternalLink size={15} style={{ color: 'var(--cd-accent-lime)' }} />
                  4. Live Booking Page
                </div>
                <span className="sf-muted sf-text-xs">Preview what your clients will experience</span>
              </a>
            )}
          </div>
        </Card>
      )}

      {/* KPI Metric Cards */}
      {kpiLoading ? (
        <SkeletonRows rows={1} height={100} />
      ) : (
        <div className="sf-kpi-grid sf-mb-6">
          <Card className="sf-kpi-card">
            <div className="sf-kpi-label">
              <CalendarClock size={15} style={{ color: 'var(--cd-accent-violet)' }} />
              Today's Schedule
            </div>
            <div className="sf-kpi-value cd-num">{kpis?.appointmentsToday ?? 0}</div>
            <div className="sf-kpi-sub">
              <span>{kpis?.upcomingAppointments ?? 0} upcoming in queue</span>
            </div>
          </Card>

          <Card className="sf-kpi-card">
            <div className="sf-kpi-label">
              <CalendarDays size={15} style={{ color: 'var(--cd-accent-lime)' }} />
              Total Bookings
            </div>
            <div className="sf-kpi-value cd-num">{kpis?.totalBookings ?? 0}</div>
            <div className="sf-kpi-sub">
              <span>{kpis?.newCustomersThisMonth ?? 0} new clients this month</span>
            </div>
          </Card>

          <Card className="sf-kpi-card">
            <div className="sf-kpi-label">
              <DollarSign size={15} style={{ color: 'var(--cd-success)' }} />
              Revenue (30 Days)
            </div>
            <div className="sf-kpi-value cd-num">
              {formatMoney(kpis?.monthlyRevenue ?? 0, currentBusiness?.currency)}
            </div>
            <div className="sf-kpi-sub">
              <span style={{ color: 'var(--cd-success)', fontWeight: 600 }}>
                {(kpis?.completionRate ?? 0).toFixed(0)}% completion rate
              </span>
            </div>
          </Card>

          <Card className="sf-kpi-card">
            <div className="sf-kpi-label">
              <AlertCircle size={15} style={{ color: 'var(--cd-warning)' }} />
              Outstanding Balance
            </div>
            <div className="sf-kpi-value cd-num" style={{ color: kpis?.outstandingAmount > 0 ? '#B5791E' : undefined }}>
              {formatMoney(kpis?.outstandingAmount ?? 0, currentBusiness?.currency)}
            </div>
            <div className="sf-kpi-sub">
              <span>Uncollected invoice balances</span>
            </div>
          </Card>
        </div>
      )}

      {/* Main Command Workspace Grids */}
      <div className="sf-detail-grid">
        {/* Left Column: Schedule & Real Data Revenue Chart */}
        <div className="sf-flex-col sf-gap-5">
          {/* Today's Schedule Card */}
          <Card>
            <CardHeader
              title="Today's Appointments"
              action={
                <Link to="/app/calendar" className="sf-text-xs sf-flex sf-items-center sf-gap-1" style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}>
                  Full calendar <ArrowRight size={13} />
                </Link>
              }
            />
            <CardBody>
              {schedLoading ? (
                <SkeletonRows rows={3} height={56} />
              ) : !schedule?.length ? (
                <EmptyState
                  title="No appointments scheduled for today"
                  description="Share your public booking link to fill your calendar."
                />
              ) : (
                <div className="sf-flex-col sf-gap-2">
                  {schedule.map((a) => (
                    <Link
                      key={a.id}
                      to={`/app/appointments/${a.id}`}
                      className="sf-row-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                      }}
                    >
                      <div className="sf-flex sf-items-center sf-gap-3">
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 'var(--sf-radius-md)',
                            background: 'var(--cd-surface-subtle)',
                            border: '1px solid var(--cd-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--cd-primary-dark)',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          <Clock size={16} />
                        </div>
                        <div>
                          <div className="sf-row-card-title" style={{ fontSize: '0.9375rem' }}>
                            <span className="cd-num">{formatTime(a.start_at)}</span> &middot; {a.service?.name}
                          </div>
                          <div className="sf-row-card-meta sf-mt-1">
                            <span>{a.customer?.full_name}</span>
                            <span>&middot;</span>
                            <span>with {a.staff?.profile?.full_name}</span>
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Revenue Velocity Chart (Recharts) */}
          <Card>
            <CardHeader
              title="Revenue Velocity (Last 14 Days)"
              action={
                <span className="sf-text-xs sf-muted">
                  Actual collected transactions
                </span>
              }
            />
            <CardBody>
              {revLoading ? (
                <SkeletonRows rows={1} height={200} />
              ) : !hasRevenue ? (
                <div className="sf-p-4 sf-text-center" style={{ padding: '2.5rem 1rem' }}>
                  <DollarSign size={28} style={{ color: 'var(--cd-secondary-text)', margin: '0 auto 8px', opacity: 0.5 }} />
                  <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark)', fontSize: 'var(--sf-fs-sm)' }}>
                    No recorded revenue yet
                  </div>
                  <p className="sf-muted sf-text-xs sf-mt-1" style={{ maxWidth: 340, margin: '4px auto 16px' }}>
                    Once you complete appointments and record payments, your 14-day velocity will chart here in real time.
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => setShowNewAppt(true)}>
                    <Plus size={13} /> Book first appointment
                  </Button>
                </div>
              ) : (
                <div style={{ height: 230, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenue || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cadenceRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C7F36B" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#C7F36B" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => formatDate(d, 'MMM d')}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E8E1' }}
                        tick={{ fill: '#747B88' }}
                      />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#747B88' }}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      />
                      <Tooltip
                        formatter={(v) => [formatMoney(v, currentBusiness?.currency), 'Revenue']}
                        labelFormatter={(d) => formatDate(d, 'EEEE, MMM d, yyyy')}
                        contentStyle={{
                          background: '#171B24',
                          border: 'none',
                          borderRadius: 8,
                          color: '#FFFFFF',
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#171B24"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#cadenceRevenueGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Quick Actions, Status Breakdown & Recent Transactions */}
        <div className="sf-flex-col sf-gap-5">
          {/* Quick Actions Panel */}
          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', color: 'var(--cd-primary-dark)' }}>
              Quick Actions
            </h3>
            <div className="sf-flex-col sf-gap-2">
              <button
                type="button"
                className="cd-quick-action"
                onClick={() => setShowNewAppt(true)}
                style={{ width: '100%', cursor: 'pointer', textAlign: 'left', border: '1px solid var(--cd-border)' }}
              >
                <span className="sf-flex sf-items-center sf-gap-2">
                  <Plus size={15} style={{ color: 'var(--cd-accent-violet)' }} />
                  New appointment
                </span>
                <ArrowRight size={14} />
              </button>

              <Link to="/app/calendar" className="cd-quick-action">
                <span className="sf-flex sf-items-center sf-gap-2">
                  <CalendarDays size={15} />
                  Open schedule calendar
                </span>
                <ArrowRight size={14} />
              </Link>

              <Link to="/app/customers" className="cd-quick-action">
                <span className="sf-flex sf-items-center sf-gap-2">
                  <Users size={15} />
                  Manage customers
                </span>
                <ArrowRight size={14} />
              </Link>

              <Link to="/app/invoices" className="cd-quick-action">
                <span className="sf-flex sf-items-center sf-gap-2">
                  <CreditCard size={15} />
                  Billing & invoices
                </span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </Card>

          {/* Status Breakdown Distribution */}
          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', color: 'var(--cd-primary-dark)' }}>
              Appointment Rhythm
            </h3>
            <div className="sf-flex-col sf-gap-2">
              {!statusBreakdown?.length ? (
                <p className="sf-muted sf-text-xs sf-p-2" style={{ textAlign: 'center' }}>
                  No appointment status records yet.
                </p>
              ) : (
                statusBreakdown.map((item) => (
                  <div key={item.status} className="sf-flex sf-justify-between sf-items-center sf-text-sm">
                    <span className="sf-flex sf-items-center sf-gap-2" style={{ textTransform: 'capitalize' }}>
                      <StatusBadge status={item.status} meta={APPOINTMENT_STATUS_META} />
                    </span>
                    <strong className="cd-num" style={{ color: 'var(--cd-primary-dark)' }}>
                      {item.count}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--cd-border)' }}>
              <div className="sf-flex sf-justify-between sf-text-xs sf-muted sf-mb-1">
                <span>No-show rate</span>
                <strong className="cd-num">{(kpis?.noShowRate ?? 0).toFixed(0)}%</strong>
              </div>
              <div className="sf-flex sf-justify-between sf-text-xs sf-muted">
                <span>Cancellation rate</span>
                <strong className="cd-num">{(kpis?.cancellationRate ?? 0).toFixed(0)}%</strong>
              </div>
            </div>
          </Card>

          {/* Recent Payments Simulation Feed */}
          <Card>
            <CardHeader title="Recent Transactions" />
            <CardBody>
              {!recentPayments?.rows.length ? (
                <p className="sf-muted sf-text-xs">No payment activity recorded yet.</p>
              ) : (
                <div className="sf-flex-col sf-gap-3">
                  {recentPayments.rows.map((p) => (
                    <div key={p.id} className="sf-flex sf-items-center sf-justify-between sf-text-xs">
                      <div className="sf-flex sf-items-center sf-gap-2">
                        <div className="sf-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>
                          {initials(p.customer?.full_name || 'C')}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--cd-primary-dark)' }}>
                            {p.customer?.full_name}
                          </div>
                          <div className="sf-muted">{PAYMENT_METHOD_LABELS[p.method]}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }} className="cd-num">
                          {formatMoney(p.amount, currentBusiness?.currency)}
                        </div>
                        <span className="sf-badge sf-badge-success" style={{ fontSize: 9, padding: '1px 5px' }}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* New Appointment Modal */}
      <Modal open={showNewAppt} onClose={() => setShowNewAppt(false)} title="New Appointment" wide>
        <NewAppointmentForm onDone={() => setShowNewAppt(false)} />
      </Modal>
    </div>
  );
}
