import { Receipt } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useMyInvoices } from '../../features/portal/hooks';
import { formatMoney, formatDate } from '../../utils/format';
import { INVOICE_STATUS_META } from '../../constants/status';
import '../app/app-pages.css';

export default function MyInvoices() {
  const { data: invoices, isLoading } = useMyInvoices();

  if (isLoading) return <SkeletonRows rows={4} height={70} />;

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">My Invoices & Receipts</h1>
          <p className="sf-muted">Review charges, payments, and billing statements.</p>
        </div>
      </div>

      {!invoices?.length ? (
        <EmptyState
          icon={<Receipt size={36} style={{ color: 'var(--cd-secondary-text, #747B88)' }} />}
          title="No invoices found"
          description="Invoices issued by businesses for your appointments will appear here."
        />
      ) : (
        <div className="sf-card-list">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '1rem', padding: '1.25rem' }}>
                <div>
                  <div className="sf-flex sf-items-center sf-gap-2">
                    <span style={{ fontFamily: 'var(--cd-font-mono, monospace)', fontWeight: 700, fontSize: 'var(--sf-fs-sm)', color: 'var(--cd-primary-dark, #171B24)' }}>
                      {inv.invoice_number}
                    </span>
                    <StatusBadge status={inv.status} meta={INVOICE_STATUS_META} />
                  </div>
                  <div className="sf-text-xs sf-muted sf-mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    Created {formatDate(inv.created_at)}
                    {inv.due_date && ` · Due ${formatDate(inv.due_date)}`}
                  </div>
                </div>

                <div className="sf-flex sf-items-center sf-gap-4">
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 'var(--sf-fs-sm)', fontWeight: 800, color: 'var(--cd-primary-dark, #171B24)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(inv.total)}
                    </div>
                    {inv.balance > 0 ? (
                      <div className="sf-text-xs" style={{ color: 'var(--cd-danger, #D75C5C)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        Due: {formatMoney(inv.balance)}
                      </div>
                    ) : (
                      <div className="sf-text-xs" style={{ color: 'var(--cd-success, #23865B)', fontWeight: 600 }}>
                        Settled in full
                      </div>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
