import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useBusiness } from '../../features/business/BusinessContext';
import {
  useRevenueSeries, useBookingsSeries, useStatusBreakdown, useServicePopularity,
  useStaffWorkload, usePaymentMethodDistribution, useNewCustomersSeries,
} from '../../features/reports/hooks';
import { formatMoney, formatDate } from '../../utils/format';
import { PAYMENT_METHOD_LABELS, APPOINTMENT_STATUS_META } from '../../constants/status';
import './app-pages.css';

const CHART_PALETTE = ['#171B24', '#7775E8', '#23865B', '#D99A32', '#38BDF8', '#D75C5C'];

function CustomTooltip({ active, payload, label, formatter, labelFormatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--cd-primary-dark, #171B24)',
        color: '#FFFFFF',
        padding: '8px 12px',
        borderRadius: 'var(--sf-radius-md)',
        fontSize: '12px',
        boxShadow: 'var(--sf-shadow-md)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ color: 'var(--cd-accent-lime, #C7F36B)', fontWeight: 600, marginBottom: 4 }}>
        {labelFormatter ? labelFormatter(label) : label}
      </div>
      {payload.map((entry, index) => (
        <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color || 'var(--cd-accent-lime, #C7F36B)' }} />
          <span>{entry.name}:</span>
          <strong>{formatter ? formatter(entry.value) : entry.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const { currentBusiness } = useBusiness();
  const currency = currentBusiness?.currency;

  const { data: revenue, isLoading: l1 } = useRevenueSeries(currentBusiness?.id, 30);
  const { data: bookings, isLoading: l2 } = useBookingsSeries(currentBusiness?.id, 30);
  const { data: statusBreakdown, isLoading: l3 } = useStatusBreakdown(currentBusiness?.id);
  const { data: servicePopularity, isLoading: l4 } = useServicePopularity(currentBusiness?.id);
  const { data: staffWorkload, isLoading: l5 } = useStaffWorkload(currentBusiness?.id);
  const { data: paymentDist, isLoading: l6 } = usePaymentMethodDistribution(currentBusiness?.id);
  const { data: newCustomers, isLoading: l7 } = useNewCustomersSeries(currentBusiness?.id, 30);

  const totalRevenue30d = (revenue || []).reduce((acc, cur) => acc + (Number(cur.revenue) || 0), 0);
  const totalBookings30d = (bookings || []).reduce((acc, cur) => acc + (Number(cur.bookings) || 0), 0);
  const totalNewCustomers30d = (newCustomers || []).reduce((acc, cur) => acc + (Number(cur.customers) || 0), 0);

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Operational analytics</h1>
          <p className="sf-muted">
            Performance metrics, volume velocity, and customer acquisition for {currentBusiness?.name} (Past 30 Days).
          </p>
        </div>
      </div>

      {/* 30-Day Highlight Metrics */}
      <div className="sf-kpi-grid sf-mb-6">
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">30-Day Revenue Recorded</div>
          <div className="sf-kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(totalRevenue30d, currency)}
          </div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">30-Day Appointments</div>
          <div className="sf-kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {totalBookings30d}
          </div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">New Client Signups</div>
          <div className="sf-kpi-value" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--cd-secondary-accent, #7775E8)' }}>
            {totalNewCustomers30d}
          </div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Active Services Catalog</div>
          <div className="sf-kpi-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {servicePopularity?.length || 0}
          </div>
        </Card>
      </div>

      <div className="sf-flex-col sf-gap-5">
        {/* Row 1: Revenue Curve & Bookings Histogram */}
        <div className="sf-grid-2">
          <Card>
            <CardHeader
              title="Revenue timeline"
              subtitle="Daily paid volume and settlements"
            />
            <CardBody>
              {l1 ? (
                <SkeletonRows rows={1} height={220} />
              ) : (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="reportsRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7775E8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#7775E8" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => formatDate(d, 'MMM d')}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E8E1' }}
                      />
                      <YAxis
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={50}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip
                        content={
                          <CustomTooltip
                            labelFormatter={(d) => formatDate(d, 'EEE, MMM d, yyyy')}
                            formatter={(v) => formatMoney(v, currency)}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#7775E8"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#reportsRevGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Bookings created"
              subtitle="Volume velocity over the last 30 days"
            />
            <CardBody>
              {l2 ? (
                <SkeletonRows rows={1} height={220} />
              ) : (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookings} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => formatDate(d, 'MMM d')}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E8E1' }}
                      />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                      <Tooltip
                        content={
                          <CustomTooltip
                            labelFormatter={(d) => formatDate(d, 'EEE, MMM d, yyyy')}
                            formatter={(v) => `${v} bookings`}
                          />
                        }
                      />
                      <Bar dataKey="bookings" name="Bookings" fill="#171B24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Row 2: Status Breakdown & Service Popularity */}
        <div className="sf-grid-2">
          <Card>
            <CardHeader
              title="Appointment status breakdown"
              subtitle="Distribution by current operational state"
            />
            <CardBody>
              {l3 ? (
                <SkeletonRows rows={1} height={220} />
              ) : !statusBreakdown?.length ? (
                <p className="sf-muted sf-text-sm">No appointment history available.</p>
              ) : (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {statusBreakdown.map((entry, i) => (
                          <Cell
                            key={entry.status}
                            fill={
                              entry.status === 'completed'
                                ? '#23865B'
                                : entry.status === 'confirmed'
                                ? '#7775E8'
                                : entry.status === 'in_progress'
                                ? '#C7F36B'
                                : entry.status === 'cancelled'
                                ? '#969DAA'
                                : entry.status === 'no_show'
                                ? '#D75C5C'
                                : CHART_PALETTE[i % CHART_PALETTE.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={
                          <CustomTooltip
                            labelFormatter={(lbl) => APPOINTMENT_STATUS_META[lbl]?.label || lbl}
                            formatter={(v) => `${v} appointments`}
                          />
                        }
                      />
                      <Legend
                        formatter={(val) => (
                          <span style={{ fontSize: '11px', color: 'var(--cd-primary-text, #202531)', fontWeight: 600 }}>
                            {APPOINTMENT_STATUS_META[val]?.label || val}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Service popularity"
              subtitle="Most frequently booked appointment types"
            />
            <CardBody>
              {l4 ? (
                <SkeletonRows rows={1} height={220} />
              ) : !servicePopularity?.length ? (
                <p className="sf-muted sf-text-sm">No bookings recorded yet.</p>
              ) : (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={servicePopularity} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" allowDecimals={false} fontSize={11} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--cd-primary-text, #202531)', fontWeight: 600 }}
                      />
                      <Tooltip
                        content={<CustomTooltip formatter={(v) => `${v} sessions booked`} />}
                      />
                      <Bar dataKey="count" name="Bookings" fill="#7775E8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Row 3: Staff Workload & Payment Methods */}
        <div className="sf-grid-2">
          <Card>
            <CardHeader
              title="Staff allocation & workload"
              subtitle="Bookings assigned per team member"
            />
            <CardBody>
              {l5 ? (
                <SkeletonRows rows={1} height={220} />
              ) : !staffWorkload?.length ? (
                <p className="sf-muted sf-text-sm">No staff assignments recorded.</p>
              ) : (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffWorkload} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={{ stroke: '#E5E8E1' }} />
                      <YAxis fontSize={11} allowDecimals={false} width={30} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip formatter={(v) => `${v} appointments`} />} />
                      <Bar dataKey="count" name="Appointments" fill="#171B24" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Payment method distribution"
              subtitle="Revenue breakdown by payment channel"
            />
            <CardBody>
              {l6 ? (
                <SkeletonRows rows={1} height={220} />
              ) : !paymentDist?.length ? (
                <p className="sf-muted sf-text-sm">No payment records on file.</p>
              ) : (
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentDist}
                        dataKey="amount"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {paymentDist.map((entry, i) => (
                          <Cell key={entry.method} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip formatter={(v) => formatMoney(v, currency)} />} />
                      <Legend
                        formatter={(val) => (
                          <span style={{ fontSize: '11px', color: 'var(--cd-primary-text, #202531)', fontWeight: 600 }}>
                            {PAYMENT_METHOD_LABELS[val] || val}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Row 4: New Customers Growth */}
        <Card>
          <CardHeader
            title="New client acquisition"
            subtitle="Customer registration cadence over the last 30 days"
          />
          <CardBody>
            {l7 ? (
              <SkeletonRows rows={1} height={200} />
            ) : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={newCustomers} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => formatDate(d, 'MMM d')}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#E5E8E1' }}
                    />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip formatter={(v) => `${v} new clients`} />} />
                    <Bar dataKey="customers" name="New Clients" fill="#D99A32" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
