import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { CalendarClock, Users, DollarSign, AlertCircle, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { SkeletonRows } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useBusiness } from '../../features/business/BusinessContext';
import { useDashboardKpis, useTodaySchedule, useRevenueSeries } from '../../features/reports/hooks';
import { formatMoney, formatTime, formatDate } from '../../utils/format';
import { APPOINTMENT_STATUS_META } from '../../constants/status';
import './app-pages.css';

export default function Dashboard() {
  const { currentBusiness } = useBusiness();
  const { data: kpis, isLoading: kpiLoading } = useDashboardKpis(currentBusiness?.id);
  const { data: schedule, isLoading: schedLoading } = useTodaySchedule(currentBusiness?.id);
  const { data: revenue } = useRevenueSeries(currentBusiness?.id, 14);

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Dashboard</h1>
          <p className="sf-muted">Here's what's happening at {currentBusiness?.name} today.</p>
        </div>
        <Link to={`/b/${currentBusiness?.slug}`} target="_blank" rel="noreferrer">
          <span className="sf-btn sf-btn-secondary sf-btn-sm">View public booking page</span>
        </Link>
      </div>

      {kpiLoading ? <SkeletonRows rows={1} height={100} /> : (
        <div className="sf-kpi-grid sf-mb-6">
          <Card className="sf-kpi-card">
            <div className="sf-kpi-label"><CalendarClock size={14} style={{ display: 'inline', marginRight: 6 }} />Today's appointments</div>
            <div className="sf-kpi-value">{kpis?.appointmentsToday ?? 0}</div>
          </Card>
          <Card className="sf-kpi-card">
            <div className="sf-kpi-label">Upcoming</div>
            <div className="sf-kpi-value">{kpis?.upcomingAppointments ?? 0}</div>
          </Card>
          <Card className="sf-kpi-card">
            <div className="sf-kpi-label"><DollarSign size={14} style={{ display: 'inline', marginRight: 6 }} />Revenue this month</div>
            <div className="sf-kpi-value">{formatMoney(kpis?.monthlyRevenue ?? 0, currentBusiness?.currency)}</div>
          </Card>
          <Card className="sf-kpi-card">
            <div className="sf-kpi-label"><AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />Outstanding balance</div>
            <div className="sf-kpi-value">{formatMoney(kpis?.outstandingAmount ?? 0, currentBusiness?.currency)}</div>
          </Card>
        </div>
      )}

      <div className="sf-detail-grid">
        <div className="sf-flex-col sf-gap-4">
          <Card>
            <CardHeader title="Today's schedule" />
            <CardBody>
              {schedLoading ? <SkeletonRows rows={3} height={50} /> : !schedule?.length ? (
                <EmptyState title="Nothing scheduled today" description="Enjoy the quiet, or share your booking page to fill the calendar." />
              ) : (
                <div className="sf-flex-col sf-gap-2">
                  {schedule.map((a) => (
                    <Link key={a.id} to={`/app/appointments/${a.id}`} className="sf-row-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div className="sf-row-card-title">{formatTime(a.start_at)} &middot; {a.service?.name}</div>
                        <div className="sf-row-card-meta">{a.customer?.full_name} with {a.staff?.profile?.full_name}</div>
                      </div>
                      <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Revenue, last 14 days" />
            <CardBody>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue || []}>
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'MMM d')} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                    <Tooltip formatter={(v) => formatMoney(v, currentBusiness?.currency)} labelFormatter={(d) => formatDate(d)} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--sf-brand-500, #3a63f0)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="sf-flex-col sf-gap-4">
          <Card padded>
            <h3 className="sf-mb-2" style={{ fontSize: 'var(--sf-fs-md)' }}>Quick actions</h3>
            <div className="sf-flex-col sf-gap-2">
              <Link to="/app/calendar" className="sf-btn sf-btn-secondary sf-btn-block" style={{ justifyContent: 'space-between' }}>
                Open calendar <ArrowRight size={14} />
              </Link>
              <Link to="/app/customers" className="sf-btn sf-btn-secondary sf-btn-block" style={{ justifyContent: 'space-between' }}>
                <span className="sf-flex sf-items-center sf-gap-2"><Users size={14} />Manage customers</span> <ArrowRight size={14} />
              </Link>
              <Link to="/app/invoices" className="sf-btn sf-btn-secondary sf-btn-block" style={{ justifyContent: 'space-between' }}>
                Review invoices <ArrowRight size={14} />
              </Link>
            </div>
          </Card>

          <Card padded>
            <h3 className="sf-mb-2" style={{ fontSize: 'var(--sf-fs-md)' }}>Performance</h3>
            <div className="sf-flex sf-justify-between sf-mb-2 sf-text-sm"><span className="sf-muted">Completion rate</span><strong>{(kpis?.completionRate ?? 0).toFixed(0)}%</strong></div>
            <div className="sf-flex sf-justify-between sf-text-sm"><span className="sf-muted">No-show rate</span><strong>{(kpis?.noShowRate ?? 0).toFixed(0)}%</strong></div>
          </Card>
        </div>
      </div>
    </div>
  );
}
