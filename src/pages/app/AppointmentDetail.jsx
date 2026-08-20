import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Scissors, Clock, FileText } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { SkeletonRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Field, Select, Textarea } from '../../components/common/FormField';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useAuth } from '../../features/auth/AuthContext';
import { useAppointment, useAppointmentActivity, useUpdateAppointmentStatus, useUpdateAppointmentNotes, useReassignStaff } from '../../features/appointments/hooks';
import { useStaffList } from '../../features/staff/hooks';
import { useCreateInvoiceFromAppointment } from '../../features/invoices/hooks';
import { APPOINTMENT_STATUS_META, APPOINTMENT_TRANSITIONS } from '../../constants/status';
import { formatDateTime, formatMoney, formatDuration, formatRelative } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import './app-pages.css';

export default function AppointmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentBusiness, role } = useBusiness();
  const { user } = useAuth();
  const canManage = role === 'owner' || role === 'admin';

  const { data: appt, isLoading } = useAppointment(id);
  const { data: activity } = useAppointmentActivity(id);
  const { data: staffList } = useStaffList(currentBusiness?.id);
  const updateStatus = useUpdateAppointmentStatus(currentBusiness?.id);
  const updateNotes = useUpdateAppointmentNotes(currentBusiness?.id);
  const reassignStaff = useReassignStaff(currentBusiness?.id);
  const createInvoice = useCreateInvoiceFromAppointment(currentBusiness?.id);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [internalNote, setInternalNote] = useState('');

  if (isLoading) return <SkeletonRows rows={4} height={80} />;
  if (!appt) return <p>Appointment not found.</p>;

  const nextStatuses = APPOINTMENT_TRANSITIONS[appt.status] || [];

  async function changeStatus(status) {
    try {
      await updateStatus.mutateAsync({ id, status, actorUserId: user?.id });
      toast.success('Status updated');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function handleCancel() {
    await changeStatus('cancelled');
    setConfirmCancel(false);
  }

  async function saveInternalNote() {
    try {
      await updateNotes.mutateAsync({ id, patch: { internal_note: internalNote || appt.internal_note } });
      toast.success('Note saved');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function handleReassign(e) {
    const staffMemberId = e.target.value;
    if (!staffMemberId) return;
    try {
      await reassignStaff.mutateAsync({ id, staffMemberId, actorUserId: user?.id });
      toast.success('Staff reassigned');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function handleCreateInvoice() {
    try {
      const inv = await createInvoice.mutateAsync(id);
      toast.success('Invoice created');
      navigate(`/app/invoices/${inv.id}`);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <Link to="/app/appointments" className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4" style={{ color: 'var(--sf-brand-600)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to appointments
      </Link>

      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">{appt.service?.name}</h1>
          <p className="sf-muted">{appt.booking_code} &middot; {formatDateTime(appt.start_at)}</p>
        </div>
        <StatusBadge status={appt.status} meta={APPOINTMENT_STATUS_META} />
      </div>

      <div className="sf-detail-grid">
        <div className="sf-flex-col sf-gap-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="sf-flex-col sf-gap-3">
              <div className="sf-flex sf-items-center sf-gap-2"><User size={16} color="var(--sf-brand-500)" /><Link to={`/app/customers/${appt.customer?.id}`} style={{ color: 'var(--sf-brand-600)', fontWeight: 700 }}>{appt.customer?.full_name}</Link></div>
              <div className="sf-flex sf-items-center sf-gap-2"><Scissors size={16} color="var(--sf-brand-500)" />{appt.service?.name} &middot; {formatMoney(appt.service?.price, currentBusiness?.currency)}</div>
              <div className="sf-flex sf-items-center sf-gap-2"><Clock size={16} color="var(--sf-brand-500)" />{formatDateTime(appt.start_at)} ({formatDuration(appt.service?.duration_minutes || 0)})</div>
              {appt.customer_note && (
                <div className="sf-flex sf-gap-2"><FileText size={16} color="var(--sf-brand-500)" /><span className="sf-text-sm">{appt.customer_note}</span></div>
              )}

              {canManage && (
                <Field label="Reassign staff" htmlFor="staff-reassign">
                  <Select id="staff-reassign" defaultValue={appt.staff_member_id} onChange={handleReassign}>
                    {staffList?.map((m) => <option key={m.id} value={m.id}>{m.profile?.full_name}</option>)}
                  </Select>
                </Field>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Internal notes" />
            <CardBody>
              <Textarea rows={3} defaultValue={appt.internal_note} onChange={(e) => setInternalNote(e.target.value)} placeholder="Notes visible to staff only" />
              <Button variant="secondary" size="sm" className="sf-mt-2" onClick={saveInternalNote} loading={updateNotes.isPending}>Save note</Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Activity" />
            <CardBody>
              {!activity?.length ? <p className="sf-muted sf-text-sm">No activity yet.</p> : activity.map((ev) => (
                <div key={ev.id} className="sf-timeline-item">
                  <div className="sf-timeline-dot" />
                  <div>
                    <div className="sf-text-sm">{ev.message}</div>
                    <div className="sf-text-xs sf-muted">{formatRelative(ev.created_at)}</div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="sf-flex-col sf-gap-4">
          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)' }}>Actions</h3>
            <div className="sf-flex-col sf-gap-2">
              {nextStatuses.filter((s) => s !== 'cancelled').map((s) => (
                <Button key={s} variant="primary" onClick={() => changeStatus(s)} loading={updateStatus.isPending}>
                  Mark as {APPOINTMENT_STATUS_META[s].label}
                </Button>
              ))}
              {nextStatuses.includes('cancelled') && (
                <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel appointment</Button>
              )}
              {canManage && appt.status === 'completed' && (
                <Button variant="secondary" onClick={handleCreateInvoice} loading={createInvoice.isPending}>Create invoice</Button>
              )}
              {!nextStatuses.length && <p className="sf-muted sf-text-sm">No further actions available.</p>}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancel this appointment?"
        description="The customer will be notified and this time slot will become available again."
        confirmLabel="Cancel appointment"
        loading={updateStatus.isPending}
      />
    </div>
  );
}
