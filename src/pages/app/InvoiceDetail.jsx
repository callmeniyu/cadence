import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2, Send, CreditCard, Ban, Printer, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [payOutcome, setPayOutcome] = useState('success');

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceEditSchema),
    defaultValues: { items: [{ description: '', quantity: 1, unitPrice: 0 }], taxRatePercent: currentBusiness?.tax_rate_percent || 0 },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Use useWatch to avoid React compiler / oxlint warnings
  const items = useWatch({ control, name: 'items' });
  const taxRatePercent = useWatch({ control, name: 'taxRatePercent' }) ?? 0;

  useEffect(() => {
    if (invoice) {
      reset({
        items: invoice.items.map((it) => ({ description: it.description, quantity: it.quantity, unitPrice: it.unit_price })),
        taxRatePercent: (invoice.tax_amount && invoice.subtotal)
          ? Math.round((invoice.tax_amount / invoice.subtotal) * 10000) / 100
          : (currentBusiness?.tax_rate_percent || 0),
      });
    }
  }, [invoice, reset, currentBusiness]);

  const { register: payRegister, handleSubmit: handlePaySubmit, reset: resetPay, formState: { errors: payErrors } } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: invoice?.balance || 0, method: 'demo_card' },
  });

  function openPayModal() {
    if (invoice) {
      resetPay({ amount: invoice.balance > 0 ? invoice.balance : invoice.total, method: 'demo_card' });
      setPayOutcome('success');
    }
    setShowPay(true);
  }

  if (isLoading) return <SkeletonRows rows={4} height={70} />;
  if (!invoice) return <p className="sf-muted">Invoice not found.</p>;

  const subtotal = items?.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0) || 0;
  const tax = Math.round(subtotal * (Number(taxRatePercent) || 0)) / 100;
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
      toast.success('Invoice issued successfully');
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
        businessId: currentBusiness.id,
        invoiceId: id,
        appointmentId: invoice.appointment_id,
        customerId: invoice.customer_id,
        amount: Number(values.amount),
        method: values.method,
        outcome: payOutcome,
      });

      if (result.status === 'failed') {
        toast.error('Simulated payment declined/failed as requested.');
      } else {
        toast.success(`Payment of ${formatMoney(values.amount, currentBusiness?.currency)} recorded`);
      }
      setShowPay(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  const isDraft = invoice.status === 'draft';
  const isPaid = invoice.status === 'paid';
  const isVoid = invoice.status === 'void';
  const canCollectPayment = ['issued', 'partially_paid', 'overdue'].includes(invoice.status) && invoice.balance > 0;

  return (
    <div>
      <Link to="/app/invoices" className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4 sf-back-link" style={{ color: 'var(--cd-primary-dark, #171B24)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to invoices
      </Link>

      <div className="sf-app-page-header">
        <div>
          <div className="sf-flex sf-items-center sf-gap-3">
            <h1 className="sf-app-page-title" style={{ fontFamily: 'var(--cd-font-mono, monospace)', letterSpacing: '-0.02em' }}>{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} meta={INVOICE_STATUS_META} />
          </div>
          <p className="sf-muted sf-mt-1">
            Customer: <strong>{invoice.customer?.full_name}</strong> &middot; Created {formatDate(invoice.created_at)}
            {invoice.due_date && ` · Due ${formatDate(invoice.due_date)}`}
          </p>
        </div>

        <div className="sf-flex sf-items-center sf-gap-2 no-print">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={15} /> Print / PDF
          </Button>
          {isDraft && (
            <Button variant="primary" size="sm" onClick={handleIssue} loading={issueInvoice.isPending}>
              <Send size={15} /> Issue invoice
            </Button>
          )}
          {canCollectPayment && (
            <Button variant="primary" size="sm" onClick={openPayModal}>
              <CreditCard size={15} /> Record payment
            </Button>
          )}
        </div>
      </div>

      <div className="sf-detail-grid">
        {/* Main Invoice Card */}
        <Card className="sf-print-invoice-sheet">
          <CardHeader
            title="Invoice details"
            subtitle={isDraft ? "Draft mode — editable until issued" : "Issued invoice"}
            action={
              invoice.appointment_id ? (
                <Link to={`/app/appointments/${invoice.appointment_id}`} className="sf-text-xs sf-flex sf-items-center sf-gap-1 no-print" style={{ color: 'var(--cd-secondary-accent, #7775E8)', fontWeight: 600 }}>
                  <FileText size={13} /> View appointment
                </Link>
              ) : null
            }
          />
          <CardBody>
            <form onSubmit={handleSubmit(saveDraft)} id="invoice-form">
              {/* Line items table / inputs */}
              <div style={{ overflowX: 'auto' }}>
                <table className="sf-table sf-mb-4" style={{ minWidth: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '55%' }}>Description</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Qty</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Unit price</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Amount</th>
                      {isDraft && <th style={{ width: 40 }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((f, idx) => {
                      const qty = Number(items?.[idx]?.quantity) || 0;
                      const prc = Number(items?.[idx]?.unitPrice) || 0;
                      const lineAmt = Math.round(qty * prc * 100) / 100;

                      return (
                        <tr key={f.id}>
                          <td>
                            {isDraft ? (
                              <Field error={errors.items?.[idx]?.description?.message} htmlFor={`desc-${idx}`} style={{ marginBottom: 0 }}>
                                <Input
                                  id={`desc-${idx}`}
                                  placeholder="Service or item description"
                                  error={!!errors.items?.[idx]?.description}
                                  {...register(`items.${idx}.description`)}
                                />
                              </Field>
                            ) : (
                              <div style={{ fontWeight: 600, color: 'var(--cd-primary-text, #202531)' }}>
                                {f.description || 'Service item'}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isDraft ? (
                              <Field error={errors.items?.[idx]?.quantity?.message} htmlFor={`qty-${idx}`} style={{ marginBottom: 0 }}>
                                <Input
                                  id={`qty-${idx}`}
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                                  {...register(`items.${idx}.quantity`)}
                                />
                              </Field>
                            ) : (
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{f.quantity}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isDraft ? (
                              <Field error={errors.items?.[idx]?.unitPrice?.message} htmlFor={`price-${idx}`} style={{ marginBottom: 0 }}>
                                <Input
                                  id={`price-${idx}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                                  {...register(`items.${idx}.unitPrice`)}
                                />
                              </Field>
                            ) : (
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(f.unit_price || f.unitPrice, currentBusiness?.currency)}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(lineAmt, currentBusiness?.currency)}
                          </td>
                          {isDraft && (
                            <td style={{ textAlign: 'center' }}>
                              {fields.length > 1 && (
                                <IconButton label="Remove line" onClick={() => remove(idx)} type="button">
                                  <Trash2 size={14} />
                                </IconButton>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isDraft && (
                <div className="sf-mb-4 no-print">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                  >
                    <Plus size={14} /> Add line item
                  </Button>
                </div>
              )}

              {/* Tax rate and summary totals */}
              <div className="sf-flex sf-justify-between sf-flex-wrap sf-gap-4 sf-pt-3" style={{ borderTop: '1px solid var(--cd-border, #E5E8E1)' }}>
                <div style={{ maxWidth: 220 }}>
                  <span className="sf-text-xs sf-muted" style={{ display: 'block', marginBottom: 4 }}>Tax Rate (%)</span>
                  {isDraft ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register('taxRatePercent')}
                      style={{ maxWidth: 120, fontVariantNumeric: 'tabular-nums' }}
                    />
                  ) : (
                    <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {Number(taxRatePercent).toFixed(2)}%
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 260 }}>
                  <div className="sf-flex sf-justify-between sf-mb-2 sf-text-sm">
                    <span className="sf-muted">Subtotal</span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(subtotal, currentBusiness?.currency)}</strong>
                  </div>
                  <div className="sf-flex sf-justify-between sf-mb-2 sf-text-sm">
                    <span className="sf-muted">Tax ({Number(taxRatePercent).toFixed(1)}%)</span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(tax, currentBusiness?.currency)}</strong>
                  </div>
                  <div className="sf-flex sf-justify-between sf-py-2 sf-mb-2" style={{ borderTop: '1px solid var(--cd-border, #E5E8E1)', borderBottom: '1px solid var(--cd-border, #E5E8E1)' }}>
                    <span style={{ fontWeight: 700, fontSize: 'var(--sf-fs-md)' }}>Total</span>
                    <strong style={{ fontWeight: 800, fontSize: 'var(--sf-fs-md)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(total, currentBusiness?.currency)}
                    </strong>
                  </div>
                  <div className="sf-flex sf-justify-between sf-mb-1 sf-text-sm">
                    <span className="sf-muted">Amount paid</span>
                    <span style={{ color: 'var(--cd-success, #23865B)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(invoice.amount_paid || 0, currentBusiness?.currency)}
                    </span>
                  </div>
                  <div className="sf-flex sf-justify-between sf-text-sm">
                    <span style={{ fontWeight: 600 }}>Balance due</span>
                    <strong style={{ color: invoice.balance > 0 ? 'var(--cd-danger, #D75C5C)' : 'var(--cd-success, #23865B)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(invoice.balance || 0, currentBusiness?.currency)}
                    </strong>
                  </div>
                </div>
              </div>

              {isDraft && (
                <div className="sf-mt-6 sf-flex sf-gap-2 no-print">
                  <Button type="submit" variant="secondary" loading={updateDraft.isPending}>
                    Save draft changes
                  </Button>
                </div>
              )}
            </form>
          </CardBody>
        </Card>

        {/* Sidebar Actions & Payments */}
        <div className="sf-flex-col sf-gap-4 no-print">
          <Card padded>
            <h3 className="sf-mb-3" style={{ fontSize: 'var(--sf-fs-md)', fontWeight: 700 }}>Invoice status</h3>
            <div className="sf-flex-col sf-gap-3">
              <div className="sf-flex sf-justify-between sf-items-center sf-text-sm">
                <span className="sf-muted">Status</span>
                <StatusBadge status={invoice.status} meta={INVOICE_STATUS_META} />
              </div>
              <div className="sf-flex sf-justify-between sf-items-center sf-text-sm">
                <span className="sf-muted">Issue date</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{invoice.issued_at ? formatDate(invoice.issued_at) : 'Not issued yet'}</span>
              </div>
              <div className="sf-flex sf-justify-between sf-items-center sf-text-sm">
                <span className="sf-muted">Due date</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{invoice.due_date ? formatDate(invoice.due_date) : 'Upon receipt'}</span>
              </div>

              <div className="sf-flex-col sf-gap-2 sf-mt-3 sf-pt-3" style={{ borderTop: '1px solid var(--cd-border, #E5E8E1)' }}>
                {isDraft && (
                  <Button variant="primary" onClick={handleIssue} loading={issueInvoice.isPending} block>
                    <Send size={15} /> Issue invoice
                  </Button>
                )}
                {canCollectPayment && (
                  <Button variant="primary" onClick={openPayModal} block>
                    <CreditCard size={15} /> Record payment
                  </Button>
                )}
                {!isVoid && !isPaid && (
                  <Button variant="ghost" onClick={() => setConfirmVoid(true)} style={{ color: 'var(--cd-danger, #D75C5C)' }} block>
                    <Ban size={15} /> Void invoice
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader
              title="Payment records"
              subtitle={invoice.payments?.length ? `${invoice.payments.length} transaction(s)` : 'No transactions recorded'}
            />
            <CardBody>
              {!invoice.payments?.length ? (
                <p className="sf-muted sf-text-sm">No payments recorded against this invoice yet.</p>
              ) : (
                <div className="sf-flex-col sf-gap-3">
                  {invoice.payments.map((p) => {
                    const isSuccess = p.status === 'successful';
                    return (
                      <div
                        key={p.id}
                        className="sf-flex-col sf-gap-1 sf-p-2"
                        style={{
                          background: 'var(--cd-surface-subtle, #FAFBF9)',
                          border: '1px solid var(--cd-border, #E5E8E1)',
                          borderRadius: 'var(--sf-radius-md)',
                        }}
                      >
                        <div className="sf-flex sf-justify-between sf-items-center sf-text-sm">
                          <div className="sf-flex sf-items-center sf-gap-2">
                            {isSuccess ? (
                              <CheckCircle2 size={15} style={{ color: 'var(--cd-success, #23865B)' }} />
                            ) : (
                              <AlertCircle size={15} style={{ color: 'var(--cd-danger, #D75C5C)' }} />
                            )}
                            <strong style={{ color: 'var(--cd-primary-dark, #171B24)' }}>
                              {PAYMENT_METHOD_LABELS[p.method] || p.method}
                            </strong>
                          </div>
                          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            {formatMoney(p.amount, currentBusiness?.currency)}
                          </span>
                        </div>
                        <div className="sf-flex sf-justify-between sf-items-center sf-text-xs sf-muted sf-mt-1">
                          <span>Ref: {p.reference || p.id.slice(0, 8)}</span>
                          <span>{p.paid_at ? formatDate(p.paid_at) : formatDate(p.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Payment Simulation Modal */}
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Record simulated payment">
        <form onSubmit={handlePaySubmit(onPay)} noValidate>
          <div className="sf-p-3 sf-mb-4" style={{ background: 'var(--cd-surface-subtle, #FAFBF9)', border: '1px solid var(--cd-border, #E5E8E1)', borderRadius: 'var(--sf-radius-md)' }}>
            <div className="sf-flex sf-justify-between sf-text-sm sf-mb-1">
              <span className="sf-muted">Invoice Balance:</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{formatMoney(invoice.balance, currentBusiness?.currency)}</strong>
            </div>
            <div className="sf-flex sf-justify-between sf-text-xs sf-muted">
              <span>Customer:</span>
              <span>{invoice.customer?.full_name}</span>
            </div>
          </div>

          <Field label="Payment Amount" required error={payErrors.amount?.message} htmlFor="pay-amount">
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.balance}
              error={!!payErrors.amount}
              {...payRegister('amount')}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
            <span className="sf-text-xs sf-muted sf-mt-1" style={{ display: 'block' }}>
              You can record full or partial payments. Partial payments leave remaining balance active.
            </span>
          </Field>

          <Field label="Payment Method" required htmlFor="pay-method">
            <Select id="pay-method" {...payRegister('method')}>
              <option value="demo_card">Demo Card (Simulated)</option>
              <option value="cash">Cash in Hand</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="wallet">Digital Wallet / Tap</option>
            </Select>
          </Field>

          <Field label="Simulation Test Scenario" htmlFor="pay-outcome">
            <Select id="pay-outcome" value={payOutcome} onChange={(e) => setPayOutcome(e.target.value)}>
              <option value="success">Successful Payment (Approved)</option>
              <option value="fail">Declined / Failed Payment (Test Failure Handling)</option>
            </Select>
            <span className="sf-text-xs sf-muted sf-mt-1" style={{ display: 'block' }}>
              Simulates real-world SaaS payment flows without external gateway network calls.
            </span>
          </Field>

          <div className="sf-flex sf-gap-2 sf-mt-6">
            <Button type="button" variant="secondary" onClick={() => setShowPay(false)} block>
              Cancel
            </Button>
            <Button type="submit" variant="primary" block loading={simulatePayment.isPending}>
              Submit payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Void Invoice Confirmation */}
      <ConfirmDialog
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        onConfirm={handleVoid}
        title="Void this invoice?"
        description="This action cannot be undone. The invoice will be cancelled and marked void."
        confirmLabel="Void invoice"
        loading={voidInvoice.isPending}
      />
    </div>
  );
}
