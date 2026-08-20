import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import { Badge } from '../../components/common/Badge';
import { useBusiness } from '../../features/business/BusinessContext';
import { usePayments } from '../../features/payments/hooks';
import { formatMoney, formatDateTime } from '../../utils/format';
import { PAYMENT_METHOD_LABELS } from '../../constants/status';
import './app-pages.css';

const PAGE_SIZE = 15;

export default function Payments() {
  const { currentBusiness } = useBusiness();
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePayments(currentBusiness?.id, { page, pageSize: PAGE_SIZE });

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Payments</h1>
          <p className="sf-muted">Simulated payment history — no real card data is ever processed.</p>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body"><SkeletonRows rows={5} height={44} /></div>
        ) : !data?.rows.length ? (
          <EmptyState title="No payments yet" />
        ) : (
          <>
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead><tr><th>Date</th><th>Customer</th><th>Invoice</th><th>Method</th><th>Status</th><th>Amount</th></tr></thead>
                <tbody>
                  {data.rows.map((p) => (
                    <tr key={p.id}>
                      <td className="sf-text-xs sf-muted">{formatDateTime(p.created_at)}</td>
                      <td>{p.customer?.full_name}</td>
                      <td>{p.invoice ? <Link to={`/app/invoices/${p.invoice.id}`} style={{ color: 'var(--sf-brand-600)', fontWeight: 700 }}>{p.invoice.invoice_number}</Link> : '—'}</td>
                      <td>{PAYMENT_METHOD_LABELS[p.method]}</td>
                      <td><Badge tone={p.status === 'successful' ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>{p.status}</Badge></td>
                      <td>{formatMoney(p.amount, currentBusiness?.currency)}</td>
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
    </div>
  );
}
