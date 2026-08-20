import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2, Send, CreditCard, Ban } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button, IconButton } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/Badge';
import { Field, Input, Select } from '../../components/common/FormField';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useInvoice, useUpdateDraftInvoice, useIssueInvoice, useVoidInvoice } from '../../features/invoices/hooks';
import { useSimulatePayment } from '../../features/payments/hooks';
import { invoiceEditSchema } from '../../schemas/invoice';
import { paymentSchema } from '../../schemas/payment';
import { formatMoney, formatDate } from '../../utils/format';
import { INVOICE_STATUS_META, PAYMENT_METHOD_LABELS } from '../../constants/status';
import { toFriendlyError } from '../../utils/errorMessages';
import './app-pages.css';

export default function InvoiceDetail() {
  const { id } = useParams();
  const toast = useToast();
  const { currentBusiness } = useBusiness();
  const { data: invoice, isLoading } = useInvoice(id);
  const updateDraft = useUpdateDraftInvoice(currentBusiness?.id);
  const issueInvoice = useIssueInvoice(currentBusiness?.id);
  const voidInvoice = useVoidInvoice(currentBusiness?.id);
  const simulatePayment = useSimulatePayment(currentBusiness?.id);

  const [showPay, setShowPay] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceEditSchema),
    defaultValues: { items: [{ description: '', quantity: 1, unitPrice: 0 }], taxRatePercent: currentBusiness?.tax_rate_percent || 0 },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (invoice) {
      reset({
        items: invoice.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unit_price })),
        taxRatePercent: (invoice.tax_amount && invoice.subtotal) ? Math.round((invoice.tax_amount / invoice.subtotal) * 10000) / 100 : (currentBusiness?.tax_rate_percent || 0),
      });
    }
  }, [invoice, reset, currentBusiness]);

  const { register: payRegister, handleSubmit: handlePaySubmit, formState: { errors: payErrors } } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: invoice?.balance || 0, method: 'cash' },
  });

  if (isLoading) return <SkeletonRows rows={4} height={70} />;
  if (!invoice) return <p>Invoice not found.</p>;

  const items = watch('items');
  const subtotal = items?.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0) || 0;
  const taxRate = watch('taxRatePercent') || 0;
  const tax = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + tax;

  async function saveDraft(values) {
    try {
      await updateDraft.mutateAsync({ id, items: values.items, taxRatePercent: values.taxRatePercent });
      toast.success('Draft saved');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function handleIssue() {
    try {
      await issueInvoice.mutateAsync(id);
      toast.success('Invoice issued');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function handleVoid() {
    try {
      await voidInvoice.mutateAsync(id);
      toast.success('Invoice voided');
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setConfirmVoid(false);
    }
  }

  async function onPay(values) {
    try {
      const result = await simulatePayment.mutateAsync({
        businessId: currentBusiness.id, invoiceId: id, appointmentId: invoice.appointment_id,
        customerId: invoice.customer_id, amount: values.amount, method: values.method, outcome: 'success',
      });
      if (result.status === 'failed') toast.error('Simulated payment failed. Try again.');
      else toast.success('Payment recorded');
      setShowPay(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  const isDraft = invoice.status === 'draft';

  return (
    <div>
      <Link to="/app/invoices" className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4" style={{ color: 'var(--sf-brand-600)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to invoices
      </Link>

      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">{invoice.invoice_number}</h1>
          <p className="sf-muted">{invoice.customer?.full_name} &middot; created {formatDate(invoice.created_at)}</p>
        </div>
        <StatusBadge status={invoice.status} meta={INVOICE_STATUS_META} />
      </div>

      <div className="sf-detail-grid">
        <Card>
          <CardHeader title="Line items" />
          <CardBody>
            <form onSubmit={handleSubmit(saveDraft)} id="invoice-form">
              {fields.map((f, idx) => (
                <div key={f.id} className="sf-flex sf-gap-2 sf-mb-2" style={{ alignItems: 'flex-start' }}>
                  <Field error={errors.items?.[idx]?.description?.message} htmlFor={`desc-${idx}`}>
                    <Input id={`desc-${idx}`} placeholder="Description" disabled={!isDraft} error={!!errors.items?.[idx]?.description} {...register(`items.${idx}.description`)} />
                  </Field>
                  <Field error={errors.items?.[idx]?.quantity?.message} htmlFor={`qty-${idx}`}>
                    <Input id={`qty-${idx}`} type="number" step="0.01" placeholder="Qty" style={{ maxWidth: 90 }} disabled={!isDraft} {...register(`items.${idx}.quantity`)} />
                  </Field>
                  <Field error={errors.items?.[idx]?.unitPrice?.message} htmlFor={`price-${idx}`}>
                    <Input id={`price-${idx}`} type="number" step="0.01" placeholder="Price" style={{ maxWidth: 110 }} disabled={!isDraft} {...register(`items.${idx}.unitPrice`)} />
                  </Field>
                  {isDraft && fields.length > 1 && (
                    <IconButton label="Remove" onClick={() => remove(idx)} style={{ marginTop: 6 }}><Trash2 size={14} /></IconButton>
                  )}
                </div>
              ))}
              {isDraft && (
                <Button type="button" variant="secondary" size="sm" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}>
                  <Plus size={14} />Add line
                </Button>
              )}

              <div className="sf-flex sf-items-center sf-gap-2 sf-mt-4" style={{ maxWidth: 260 }}>
                <span className="sf-text-sm sf-muted">Tax rate %</span>
                <Input type="number" step="0.01" disabled={!isDraft} {...register('taxRatePercent')} style={{ maxWidth: 100 }} />
              </div>

              <div className="sf-booking-summary sf-mt-4">
                <div className="sf-flex sf-justify-between sf-mb-2"><span className="sf-muted">Subtotal</span><strong>{formatMoney(subtotal, currentBusiness?.currency)}</strong></div>
                <div className="sf-flex sf-justify-between sf-mb-2"><span className="sf-muted">Tax</span><strong>{formatMoney(tax, currentBusiness?.currency)}</strong></div>
                <div className="sf-flex sf-justify-between"><span className="sf-muted">Total</span><strong>{formatMoney(total, currentBusiness?.currency)}</strong></div>
              </div>

              {isDraft && (
                <Button type="submit" variant="secondary" className="sf-mt-4" loading={updateDraft.isPending}>Save draft</Button>
              )}
            </form>
          </CardBody>
        </Card>

        <div className="sf-flex-col sf-gap-4">
          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)' }}>Actions</h3>
            <div className="sf-flex-col sf-gap-2">
              {isDraft && <Button variant="primary" onClick={handleIssue} loading={issueInvoice.isPending}><Send size={16} />Issue invoice</Button>}
              {['issued', 'partially_paid', 'overdue'].includes(invoice.status) && (
                <Button variant="primary" onClick={() => setShowPay(true)}><CreditCard size={16} />Record payment</Button>
              )}
              {invoice.status !== 'void' && invoice.status !== 'paid' && (
                <Button variant="danger" onClick={() => setConfirmVoid(true)}><Ban size={16} />Void invoice</Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payments" />
            <CardBody>
              {!invoice.payments?.length ? <p className="sf-muted sf-text-sm">No payments yet.</p> : (
                <div className="sf-flex-col sf-gap-2">
                  {invoice.payments.map((p) => (
                    <div key={p.id} className="sf-flex sf-justify-between sf-text-sm">
                      <span>{PAYMENT_METHOD_LABELS[p.method]}</span>
                      <strong>{formatMoney(p.amount, currentBusiness?.currency)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={showPay} onClose={() => setShowPay(false)} title="Record payment">
        <form onSubmit={handlePaySubmit(onPay)} noValidate>
          <Field label="Amount" required error={payErrors.amount?.message} htmlFor="amount">
            <Input id="amount" type="number" step="0.01" defaultValue={invoice.balance} error={!!payErrors.amount} {...payRegister('amount')} />
          </Field>
          <Field label="Method" required htmlFor="method">
            <Select id="method" {...payRegister('method')}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <p className="sf-text-xs sf-muted sf-mb-4">Simulated payment — no real card data is collected or processed.</p>
          <Button type="submit" variant="primary" block loading={simulatePayment.isPending}>Record payment</Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        onConfirm={handleVoid}
        title="Void this invoice?"
        description="This cannot be undone. The invoice will no longer be collectible."
        confirmLabel="Void invoice"
        loading={voidInvoice.isPending}
      />
    </div>
  );
}
