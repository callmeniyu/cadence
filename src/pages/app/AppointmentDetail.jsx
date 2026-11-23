import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Scissors, Clock, FileText, CalendarCheck } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { SkeletonRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Field, Select, Textarea } from '../../components/common/FormField';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useAuth } from '../../features/auth/AuthContext';
import {
  useAppointment,
  useAppointmentActivity,
  useUpdateAppointmentStatus,
  useUpdateAppointmentNotes,
  useReassignStaff,
} from '../../features/appointments/hooks';
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
  if (!appt) return <p className="sf-muted">Appointment not found.</p>;

  const nextStatuses = APPOINTMENT_TRANSITIONS[appt.status] || [];

  async function changeStatus(status) {
    try {
      await updateStatus.mutateAsync({ id, status, actorUserId: user?.id });
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
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
      await updateNotes.mutateAsync({ id, patch: { internal_note: internalNote !== '' ? internalNote : appt.internal_note } });
      toast.success('Internal note saved');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function handleReassign(e) {
    const staffMemberId = e.target.value;
    if (!staffMemberId || staffMemberId === appt.staff_member_id) return;
    try {
      await reassignStaff.mutateAsync({ id, staffMemberId, actorUserId: user?.id });
      toast.success('Staff practitioner reassigned');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function handleCreateInvoice() {
    try {
      const inv = await createInvoice.mutateAsync(id);
      toast.success('Invoice drafted successfully');
      navigate(`/app/invoices/${inv.id}`);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <Link
        to="/app/appointments"
        className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4"
        style={{ color: 'var(--cd-primary-dark)', fontWeight: 600, textDecoration: 'none' }}
      >
        <ArrowLeft size={14} /> Back to appointments
      </Link>

      <div className="sf-app-page-header">
        <div>
          <div className="sf-flex sf-items-center sf-gap-2 sf-mb-1">
            <span
              style={{
                fontFamily: 'var(--sf-font-mono)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--cd-secondary-text)',
              }}
            >
              {appt.booking_code}
            </span>
            <span className="sf-text-xs sf-muted">&middot;</span>
            <span className="sf-text-xs sf-muted">Source: {appt.source?.replace('_', ' ') || 'public'}</span>
          </div>
          <h1 className="sf-app-page-title">{appt.service?.name}</h1>
          <p className="sf-muted">{formatDateTime(appt.start_at)}</p>
        </div>

        <div className="sf-flex sf-items-center sf-gap-2">
          <StatusBadge status={appt.status} meta={APPOINTMENT_STATUS_META} />
          {canManage && !['completed', 'cancelled', 'no_show'].includes(appt.status) && (
            <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
              Cancel appointment
            </Button>
          )}
        </div>
      </div>

      <div className="sf-detail-grid">
        <div className="sf-flex-col sf-gap-5">
          {/* Appointment Information Card */}
          <Card>
            <CardHeader title="Appointment Overview" />
            <CardBody className="sf-flex-col sf-gap-3">
              <div className="sf-flex sf-items-center sf-gap-3">
                <User size={16} color="var(--cd-primary-dark)" />
                <div>
                  <span className="sf-text-xs sf-muted">Client: </span>
                  {appt.customer ? (
                    <Link
                      to={`/app/customers/${appt.customer.id}`}
                      style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}
                    >
                      {appt.customer.full_name}
                    </Link>
                  ) : (
                    '—'
                  )}
                  {appt.customer?.phone && <span className="sf-text-xs sf-muted"> ({appt.customer.phone})</span>}
                </div>
              </div>

              <div className="sf-flex sf-items-center sf-gap-3">
                <Scissors size={16} color="var(--cd-primary-dark)" />
                <div>
                  <span className="sf-text-xs sf-muted">Service: </span>
                  <strong>{appt.service?.name}</strong> &middot;{' '}
                  <span className="cd-num">{formatMoney(appt.service?.price, currentBusiness?.currency)}</span>
                </div>
              </div>

              <div className="sf-flex sf-items-center sf-gap-3">
                <Clock size={16} color="var(--cd-primary-dark)" />
                <div>
                  <span className="sf-text-xs sf-muted">Time & Duration: </span>
                  <span className="cd-num">{formatDateTime(appt.start_at)}</span> ({formatDuration(appt.service?.duration_minutes || 0)})
                </div>
              </div>

              {appt.customer_note && (
                <div
                  className="sf-flex sf-gap-2 sf-mt-2"
                  style={{
                    background: 'var(--cd-surface-subtle)',
                    padding: '0.75rem',
                    borderRadius: 'var(--sf-radius-md)',
                    border: '1px solid var(--cd-border)',
                  }}
                >
                  <FileText size={16} color="var(--cd-secondary-text)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cd-secondary-text)' }}>Client Note</div>
                    <div className="sf-text-sm">{appt.customer_note}</div>
                  </div>
                </div>
              )}

              {canManage && (
                <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--cd-border-subtle)' }}>
                  <Field label="Reassign Staff Practitioner" htmlFor="staff-reassign">
                    <Select id="staff-reassign" defaultValue={appt.staff_member_id} onChange={handleReassign}>
                      {staffList?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.profile?.full_name} ({m.role})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Internal Notes Card */}
          <Card>
            <CardHeader title="Internal Notes (Staff Only)" />
            <CardBody>
              <Textarea
                rows={3}
                defaultValue={appt.internal_note}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Notes visible to staff members only..."
              />
              <Button
                variant="secondary"
                size="sm"
                className="sf-mt-3"
                onClick={saveInternalNote}
                loading={updateNotes.isPending}
              >
                Save internal note
              </Button>
            </CardBody>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader title="Activity Timeline" />
            <CardBody>
              {!activity?.length ? (
                <p className="sf-muted sf-text-sm">No activity recorded yet.</p>
              ) : (
                activity.map((ev) => (
                  <div key={ev.id} className="sf-timeline-item">
                    <div className="sf-timeline-dot" />
                    <div style={{ flex: 1 }}>
                      <div className="sf-text-sm" style={{ fontWeight: 600, color: 'var(--cd-primary-dark)' }}>
                        {ev.message}
                      </div>
                      <div className="sf-text-xs sf-muted sf-mt-1 cd-num">
                        {formatRelative(ev.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Workflow Actions & Invoice Creation */}
        <div className="sf-flex-col sf-gap-5">
          {/* Status Progression Card */}
          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', color: 'var(--cd-primary-dark)' }}>
              Status Progression
            </h3>

            {nextStatuses.length === 0 ? (
              <p className="sf-muted sf-text-sm">
                This appointment is in terminal state <strong>{appt.status}</strong>.
              </p>
            ) : (
              <div className="sf-flex-col sf-gap-2">
                <span className="sf-text-xs sf-muted sf-mb-1">Advance workflow:</span>
                {nextStatuses
                  .filter((s) => s !== 'cancelled')
                  .map((st) => (
                    <Button
                      key={st}
                      variant="primary"
                      onClick={() => changeStatus(st)}
                      loading={updateStatus.isPending}
                      style={{ justifyContent: 'space-between', textTransform: 'capitalize' }}
                    >
                      <span>Mark as {st.replace('_', ' ')}</span>
                      <CalendarCheck size={14} />
                    </Button>
                  ))}
              </div>
            )}
          </Card>

          {/* Billing & Invoice CTA Card */}
          <Card padded>
            <h3 className="sf-mb-2" style={{ fontSize: 'var(--sf-fs-md)', color: 'var(--cd-primary-dark)' }}>
              Billing & Invoicing
            </h3>
            <p className="sf-muted sf-text-xs sf-mb-4">
              Payment status:{' '}
              <strong style={{ textTransform: 'capitalize', color: 'var(--cd-primary-dark)' }}>
                {appt.payment_status.replace('_', ' ')}
              </strong>
            </p>

            <Button
              variant="secondary"
              block
              onClick={handleCreateInvoice}
              loading={createInvoice.isPending}
            >
              <FileText size={15} /> Create invoice from appointment
            </Button>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancel this appointment?"
        description="Cancelling will immediately release the time slot for other clients to book."
        confirmLabel="Cancel appointment"
        loading={updateStatus.isPending}
      />
    </div>
  );
}
