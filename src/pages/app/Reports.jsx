import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useBusiness } from '../../features/business/BusinessContext';
import {
  useRevenueSeries, useBookingsSeries, useStatusBreakdown, useServicePopularity,
  useStaffWorkload, usePaymentMethodDistribution, useNewCustomersSeries,
} from '../../features/reports/hooks';
import { formatMoney, formatDate } from '../../utils/format';
import { PAYMENT_METHOD_LABELS } from '../../constants/status';
import './app-pages.css';

const COLORS = ['#3a63f0', '#16b3a3', '#d98b1a', '#8a5cf5', '#dd4b4b', '#5f86ff'];

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

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Reports</h1>
          <p className="sf-muted">Trends across the last 30 days.</p>
        </div>
      </div>

      <div className="sf-flex-col sf-gap-4">
        <div className="sf-grid-2">
          <Card>
            <CardHeader title="Revenue" />
            <CardBody>
              {l1 ? <SkeletonRows rows={1} height={200} /> : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenue}>
                      <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'MMM d')} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} width={44} />
                      <Tooltip formatter={(v) => formatMoney(v, currency)} labelFormatter={(d) => formatDate(d)} />
                      <Line type="monotone" dataKey="revenue" stroke="#3a63f0" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Bookings created" />
            <CardBody>
              {l2 ? <SkeletonRows rows={1} height={200} /> : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookings}>
                      <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'MMM d')} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                      <Tooltip labelFormatter={(d) => formatDate(d)} />
                      <Bar dataKey="bookings" fill="#16b3a3" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="sf-grid-2">
          <Card>
            <CardHeader title="Appointment status breakdown" />
            <CardBody>
              {l3 ? <SkeletonRows rows={1} height={200} /> : !statusBreakdown?.length ? <p className="sf-muted sf-text-sm">No data yet.</p> : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                        {statusBreakdown.map((entry, i) => <Cell key={entry.status} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Most popular services" />
            <CardBody>
              {l4 ? <SkeletonRows rows={1} height={200} /> : !servicePopularity?.length ? <p className="sf-muted sf-text-sm">No data yet.</p> : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={servicePopularity} layout="vertical">
                      <XAxis type="number" allowDecimals={false} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3a63f0" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="sf-grid-2">
          <Card>
            <CardHeader title="Staff workload" />
            <CardBody>
              {l5 ? <SkeletonRows rows={1} height={200} /> : !staffWorkload?.length ? <p className="sf-muted sf-text-sm">No data yet.</p> : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffWorkload}>
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} width={30} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8a5cf5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Payment methods" />
            <CardBody>
              {l6 ? <SkeletonRows rows={1} height={200} /> : !paymentDist?.length ? <p className="sf-muted sf-text-sm">No data yet.</p> : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentDist} dataKey="amount" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={(d) => PAYMENT_METHOD_LABELS[d.method]}>
                        {paymentDist.map((entry, i) => <Cell key={entry.method} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(v, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="New customers" />
          <CardBody>
            {l7 ? <SkeletonRows rows={1} height={200} /> : (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={newCustomers}>
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, 'MMM d')} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                    <Tooltip labelFormatter={(d) => formatDate(d)} />
                    <Bar dataKey="customers" fill="#d98b1a" radius={[4, 4, 0, 0]} />
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
