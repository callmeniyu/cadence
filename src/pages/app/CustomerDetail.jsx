import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Mail, Phone } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Field, Input, Textarea } from '../../components/common/FormField';
import { StatusBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { SkeletonRows } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useCustomer, useUpdateCustomer } from '../../features/customers/hooks';
import { useAppointments } from '../../features/appointments/hooks';
import { customerSchema } from '../../schemas/customer';
import { formatMoney, formatDateTime, initials } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import { APPOINTMENT_STATUS_META } from '../../constants/status';
import NewAppointmentForm from './components/NewAppointmentForm';
import './app-pages.css';

export default function CustomerDetail() {
  const { id } = useParams();
  const { currentBusiness } = useBusiness();
  const toast = useToast();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: apptData } = useAppointments(currentBusiness?.id, { pageSize: 100 });
  const updateCustomer = useUpdateCustomer(currentBusiness?.id);

  const [editing, setEditing] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    values: customer ? { fullName: customer.full_name, email: customer.email || '', phone: customer.phone || '', notes: customer.notes || '' } : undefined,
  });

  if (isLoading) return <SkeletonRows rows={4} height={70} />;
  if (!customer) return <p>Customer not found.</p>;

  const customerAppts = (apptData?.rows || []).filter((a) => a.customer_id === id).sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

  async function onSubmit(values) {
    try {
      await updateCustomer.mutateAsync({ id, patch: values });
      toast.success('Customer updated');
      setEditing(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <Link to="/app/customers" className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4" style={{ color: 'var(--sf-brand-600)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to customers
      </Link>

      <div className="sf-app-page-header">
        <div className="sf-flex sf-items-center sf-gap-3">
          <span className="sf-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{initials(customer.full_name)}</span>
          <div>
            <h1 className="sf-app-page-title">{customer.full_name}</h1>
            <p className="sf-muted sf-flex sf-gap-3">
              {customer.email && <span className="sf-flex sf-items-center sf-gap-1"><Mail size={13} />{customer.email}</span>}
              {customer.phone && <span className="sf-flex sf-items-center sf-gap-1"><Phone size={13} />{customer.phone}</span>}
            </p>
          </div>
        </div>
        <div className="sf-flex sf-gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          <Button variant="primary" onClick={() => setShowNewAppt(true)}><Plus size={16} />New appointment</Button>
        </div>
      </div>

      <div className="sf-kpi-grid sf-mb-6">
        <Card className="sf-kpi-card"><div className="sf-kpi-label">Appointments</div><div className="sf-kpi-value">{customer.appointmentCount}</div></Card>
        <Card className="sf-kpi-card"><div className="sf-kpi-label">Total paid</div><div className="sf-kpi-value">{formatMoney(customer.totalPaid, currentBusiness?.currency)}</div></Card>
        <Card className="sf-kpi-card"><div className="sf-kpi-label">Outstanding</div><div className="sf-kpi-value">{formatMoney(customer.outstanding, currentBusiness?.currency)}</div></Card>
        <Card className="sf-kpi-card"><div className="sf-kpi-label">Next visit</div><div className="sf-kpi-value" style={{ fontSize: 'var(--sf-fs-md)' }}>{customer.upcomingAppointment ? formatDateTime(customer.upcomingAppointment.start_at) : '—'}</div></Card>
      </div>

      <div className="sf-detail-grid">
        <Card>
          <CardHeader title="Appointment history" />
          <CardBody>
            {!customerAppts.length ? <EmptyState title="No appointments yet" /> : (
              <div className="sf-flex-col sf-gap-2">
                {customerAppts.map((a) => (
                  <Link key={a.id} to={`/app/appointments/${a.id}`} className="sf-row-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="sf-row-card-title">{a.service?.name}</div>
                      <div className="sf-row-card-meta">{formatDateTime(a.start_at)}</div>
                    </div>
                    <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card padded>
          <h3 className="sf-mb-2" style={{ fontSize: 'var(--sf-fs-md)' }}>Notes</h3>
          <p className="sf-muted sf-text-sm">{customer.notes || 'No notes on file.'}</p>
        </Card>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit customer">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Full name" required error={errors.fullName?.message} htmlFor="fullName">
            <Input id="fullName" error={!!errors.fullName} {...register('fullName')} />
          </Field>
          <Field label="Email" error={errors.email?.message} htmlFor="email">
            <Input id="email" type="email" error={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Phone" error={errors.phone?.message} htmlFor="phone">
            <Input id="phone" error={!!errors.phone} {...register('phone')} />
          </Field>
          <Field label="Notes" error={errors.notes?.message} htmlFor="notes">
            <Textarea id="notes" rows={3} {...register('notes')} />
          </Field>
          <Button type="submit" variant="primary" block loading={updateCustomer.isPending}>Save changes</Button>
        </form>
      </Modal>

      <Modal open={showNewAppt} onClose={() => setShowNewAppt(false)} title="New appointment" wide>
        <NewAppointmentForm onDone={() => setShowNewAppt(false)} prefillCustomer={{ fullName: customer.full_name, email: customer.email, phone: customer.phone }} />
      </Modal>
    </div>
  );
}
