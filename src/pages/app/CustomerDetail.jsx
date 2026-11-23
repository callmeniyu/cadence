import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Mail, Phone, Calendar, Receipt, Edit3, ArrowRight } from 'lucide-react';
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
import { useInvoices } from '../../features/invoices/hooks';
import { customerSchema } from '../../schemas/customer';
import { formatMoney, formatDateTime, formatDate, initials } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import { APPOINTMENT_STATUS_META, INVOICE_STATUS_META } from '../../constants/status';
import NewAppointmentForm from './components/NewAppointmentForm';
import './app-pages.css';

export default function CustomerDetail() {
  const { id } = useParams();
  const { currentBusiness } = useBusiness();
  const toast = useToast();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: apptData } = useAppointments(currentBusiness?.id, { pageSize: 100 });
  const { data: invoiceData } = useInvoices(currentBusiness?.id, { customerId: id, pageSize: 50 });
  const updateCustomer = useUpdateCustomer(currentBusiness?.id);

  const [editing, setEditing] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(customerSchema),
    values: customer ? { fullName: customer.full_name, email: customer.email || '', phone: customer.phone || '', notes: customer.notes || '' } : undefined,
  });

  if (isLoading) return <SkeletonRows rows={4} height={70} />;
  if (!customer) return <p className="sf-muted">Customer record not found.</p>;

  const customerAppts = (apptData?.rows || [])
    .filter((a) => a.customer_id === id)
    .sort((a, b) => new Date(b.start_at) - new Date(a.start_at));

  const customerInvoices = invoiceData?.rows || [];

  async function onSubmit(values) {
    try {
      await updateCustomer.mutateAsync({ id, patch: values });
      toast.success('Customer profile updated');
      setEditing(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <Link to="/app/customers" className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4" style={{ color: 'var(--cd-primary-dark, #171B24)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to customer directory
      </Link>

      <div className="sf-app-page-header">
        <div className="sf-flex sf-items-center sf-gap-3">
          <span className="sf-avatar" style={{ width: 48, height: 48, fontSize: 16, background: 'var(--cd-primary-dark, #171B24)', color: 'var(--cd-accent-lime, #C7F36B)' }}>
            {initials(customer.full_name)}
          </span>
          <div>
            <h1 className="sf-app-page-title">{customer.full_name}</h1>
            <p className="sf-muted sf-flex sf-gap-3 sf-text-xs sf-mt-1">
              {customer.email && <span className="sf-flex sf-items-center sf-gap-1"><Mail size={13} />{customer.email}</span>}
              {customer.phone && <span className="sf-flex sf-items-center sf-gap-1"><Phone size={13} />{customer.phone}</span>}
              <span>&middot;</span>
              <span>Client since {formatDate(customer.created_at)}</span>
            </p>
          </div>
        </div>
        <div className="sf-flex sf-gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Edit3 size={14} /> Edit profile
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowNewAppt(true)}>
            <Plus size={15} /> New booking
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="sf-kpi-grid sf-mb-6">
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Total bookings</div>
          <div className="sf-kpi-value">{customer.appointmentCount || customerAppts.length}</div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Total revenue paid</div>
          <div className="sf-kpi-value">{formatMoney(customer.totalPaid || 0, currentBusiness?.currency)}</div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Outstanding balance</div>
          <div className="sf-kpi-value" style={{ color: (customer.outstanding || 0) > 0 ? 'var(--cd-danger, #D75C5C)' : undefined }}>
            {formatMoney(customer.outstanding || 0, currentBusiness?.currency)}
          </div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Next scheduled visit</div>
          <div className="sf-kpi-value" style={{ fontSize: 'var(--sf-fs-md)' }}>
            {customer.upcomingAppointment ? formatDateTime(customer.upcomingAppointment.start_at) : 'None scheduled'}
          </div>
        </Card>
      </div>

      <div className="sf-detail-grid">
        {/* Left Column: Appointments and Invoices */}
        <div className="sf-flex-col sf-gap-5">
          {/* Appointment History */}
          <Card>
            <CardHeader
              title="Appointment history"
              subtitle={`${customerAppts.length} total appointment record(s)`}
              action={
                <Button size="sm" variant="ghost" onClick={() => setShowNewAppt(true)} style={{ color: 'var(--cd-secondary-accent, #7775E8)' }}>
                  <Plus size={14} /> Book visit
                </Button>
              }
            />
            <CardBody>
              {!customerAppts.length ? (
                <EmptyState title="No appointments on record" message="Book a new session for this customer." />
              ) : (
                <div className="sf-flex-col sf-gap-2">
                  {customerAppts.map((a) => (
                    <Link
                      key={a.id}
                      to={`/app/appointments/${a.id}`}
                      className="sf-row-card sf-p-3"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textDecoration: 'none',
                        border: '1px solid var(--cd-border, #E5E8E1)',
                        borderRadius: 'var(--sf-radius-md)',
                      }}
                    >
                      <div className="sf-flex sf-items-center sf-gap-3">
                        <Calendar size={18} style={{ color: 'var(--cd-secondary-text, #747B88)' }} />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark, #171B24)', fontSize: 'var(--sf-fs-sm)' }}>
                            {a.service?.name || 'Service appointment'}
                          </div>
                          <div className="sf-text-xs sf-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatDateTime(a.start_at)}
                            {a.staff?.profile?.full_name && ` · with ${a.staff.profile.full_name}`}
                          </div>
                        </div>
                      </div>
                      <div className="sf-flex sf-items-center sf-gap-2">
                        <StatusBadge status={a.status} meta={APPOINTMENT_STATUS_META} />
                        <ArrowRight size={14} className="sf-muted" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Invoices & Billing History */}
          <Card>
            <CardHeader
              title="Invoices & billing"
              subtitle={`${customerInvoices.length} invoice(s) generated`}
            />
            <CardBody>
              {!customerInvoices.length ? (
                <p className="sf-muted sf-text-sm">No invoices recorded for this customer yet.</p>
              ) : (
                <div className="sf-flex-col sf-gap-2">
                  {customerInvoices.map((inv) => (
                    <Link
                      key={inv.id}
                      to={`/app/invoices/${inv.id}`}
                      className="sf-row-card sf-p-3"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textDecoration: 'none',
                        border: '1px solid var(--cd-border, #E5E8E1)',
                        borderRadius: 'var(--sf-radius-md)',
                      }}
                    >
                      <div className="sf-flex sf-items-center sf-gap-3">
                        <Receipt size={18} style={{ color: 'var(--cd-secondary-accent, #7775E8)' }} />
                        <div>
                          <div style={{ fontWeight: 700, fontFamily: 'var(--cd-font-mono, monospace)', color: 'var(--cd-primary-dark, #171B24)', fontSize: 'var(--sf-fs-sm)' }}>
                            {inv.invoice_number}
                          </div>
                          <div className="sf-text-xs sf-muted">
                            Created {formatDate(inv.created_at)}
                            {inv.due_date && ` · Due ${formatDate(inv.due_date)}`}
                          </div>
                        </div>
                      </div>
                      <div className="sf-flex sf-items-center sf-gap-3">
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: 'var(--sf-fs-sm)', fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(inv.total, currentBusiness?.currency)}
                          </div>
                          {inv.balance > 0 && (
                            <div className="sf-text-xs" style={{ color: 'var(--cd-danger, #D75C5C)', fontVariantNumeric: 'tabular-nums' }}>
                              Due: {formatMoney(inv.balance, currentBusiness?.currency)}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={inv.status} meta={INVOICE_STATUS_META} />
                        <ArrowRight size={14} className="sf-muted" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Customer Details & Notes */}
        <div className="sf-flex-col sf-gap-4">
          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', fontWeight: 700, color: 'var(--cd-primary-dark, #171B24)' }}>
              Internal client notes
            </h3>
            <p className="sf-muted sf-text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {customer.notes || 'No internal notes on file. Click "Edit profile" to add preferences, allergies, or account remarks.'}
            </p>
          </Card>

          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', fontWeight: 700, color: 'var(--cd-primary-dark, #171B24)' }}>
              Contact information
            </h3>
            <div className="sf-flex-col sf-gap-2 sf-text-sm">
              <div className="sf-flex sf-justify-between">
                <span className="sf-muted">Email</span>
                <span style={{ fontWeight: 500 }}>{customer.email || '—'}</span>
              </div>
              <div className="sf-flex sf-justify-between">
                <span className="sf-muted">Phone</span>
                <span style={{ fontWeight: 500 }}>{customer.phone || '—'}</span>
              </div>
              <div className="sf-flex sf-justify-between">
                <span className="sf-muted">Customer ID</span>
                <span style={{ fontFamily: 'var(--cd-font-mono, monospace)', fontSize: '11px' }}>{customer.id.slice(0, 8)}...</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Customer Profile Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit customer profile">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Full name" required error={errors.fullName?.message} htmlFor="fullName">
            <Input id="fullName" error={!!errors.fullName} {...register('fullName')} />
          </Field>
          <Field label="Email address" error={errors.email?.message} htmlFor="email">
            <Input id="email" type="email" error={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Phone number" error={errors.phone?.message} htmlFor="phone">
            <Input id="phone" error={!!errors.phone} {...register('phone')} />
          </Field>
          <Field label="Internal notes / preferences" error={errors.notes?.message} htmlFor="notes">
            <Textarea id="notes" rows={3} placeholder="Customer preferences, reminders, or special instructions" {...register('notes')} />
          </Field>
          <div className="sf-flex sf-gap-2 sf-mt-4">
            <Button type="button" variant="secondary" onClick={() => setEditing(false)} block>
              Cancel
            </Button>
            <Button type="submit" variant="primary" block loading={updateCustomer.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Appointment Modal */}
      <Modal open={showNewAppt} onClose={() => setShowNewAppt(false)} title="New appointment" wide>
        <NewAppointmentForm
          onDone={() => setShowNewAppt(false)}
          prefillCustomer={{ fullName: customer.full_name, email: customer.email, phone: customer.phone }}
        />
      </Modal>
    </div>
  );
}
