import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Input, Select } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { useBusiness } from '../../features/business/BusinessContext';
import { useAppointments } from '../../features/appointments/hooks';
import { useServices } from '../../features/services/hooks';
import { useStaffList } from '../../features/staff/hooks';
import { formatDateTime } from '../../utils/format';
import { APPOINTMENT_STATUS, APPOINTMENT_STATUS_META } from '../../constants/status';
import NewAppointmentForm from './components/NewAppointmentForm';
import './app-pages.css';

const PAGE_SIZE = 10;

export default function Appointments() {
  const { currentBusiness } = useBusiness();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffMemberId, setStaffMemberId] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);

  const { data: services } = useServices(currentBusiness?.id);
  const { data: staffList } = useStaffList(currentBusiness?.id);
  const { data, isLoading } = useAppointments(currentBusiness?.id, { search, status: status || undefined, serviceId: serviceId || undefined, staffMemberId: staffMemberId || undefined, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Appointments</h1>
          <p className="sf-muted">All bookings for {currentBusiness?.name}.</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}><Plus size={16} />New appointment</Button>
      </div>

      <div className="sf-filter-bar">
        <div className="sf-search-input-wrap">
          <Search size={15} />
          <Input placeholder="Search by name or code" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {Object.values(APPOINTMENT_STATUS).map((s) => <option key={s} value={s}>{APPOINTMENT_STATUS_META[s].label}</option>)}
        </Select>
        <Select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setPage(1); }}>
          <option value="">All services</option>
          {services?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={staffMemberId} onChange={(e) => { setStaffMemberId(e.target.value); setPage(1); }}>
          <option value="">All staff</option>
          {staffList?.map((m) => <option key={m.id} value={m.id}>{m.profile?.full_name}</option>)}
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body"><SkeletonRows rows={5} height={44} /></div>
        ) : !data?.rows.length ? (
          <EmptyState title="No appointments found" description="Try adjusting your filters, or create a new appointment." />
        ) : (
          <>
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead>
                  <tr><th>When</th><th>Customer</th><th>Service</th><th>Staff</th><th>Status</th><th>Payment</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((a) => (
                    <tr key={a.id}>
                      <td><Link to={`/app/appointments/${a.id}`} style={{ color: 'var(--sf-brand-600)', fontWeight: 700 }}>{formatDateTime(a.start_at)}</Link></td>
                      <td>{a.customer?.full_name}</td>
                      <td>{a.service?.name}</td>
                      <td>{a.staff?.profile?.full_name}</td>
                      <td><StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} /></td>
                      <td className="sf-text-xs sf-muted" style={{ textTransform: 'capitalize' }}>{a.payment_status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sf-card-body" style={{ paddingTop: 0 }}>
              <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
            </div>
          </>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New appointment" wide>
        <NewAppointmentForm onDone={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}
