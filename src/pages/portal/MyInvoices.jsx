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
      <h1 className="sf-app-page-title sf-mb-4">My invoices</h1>
      {!invoices?.length ? <EmptyState title="No invoices yet" /> : (
        <div className="sf-card-list">
          {invoices.map((inv) => (
            <Card key={inv.id}>
              <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div className="sf-row-card-title">{inv.invoice_number}</div>
                  <div className="sf-row-card-meta">Created {formatDate(inv.created_at)} &middot; Balance {formatMoney(inv.balance)}</div>
                </div>
                <div className="sf-flex sf-items-center sf-gap-3">
                  <strong>{formatMoney(inv.total)}</strong>
                  <StatusBadge status={inv.status} meta={INVOICE_STATUS_META} />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
