import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
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

  const totalSuccessful = (data?.rows || [])
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Payments & transactions</h1>
          <p className="sf-muted">
            Simulated ledger of all recorded payments and settlement attempts in {currentBusiness?.name}.
          </p>
        </div>
      </div>

      <div className="sf-kpi-grid sf-mb-6">
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Total recorded transactions</div>
          <div className="sf-kpi-value">{data?.total || 0}</div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Page settlement volume</div>
          <div className="sf-kpi-value" style={{ color: 'var(--cd-success, #23865B)' }}>
            {formatMoney(totalSuccessful, currentBusiness?.currency)}
          </div>
        </Card>
        <Card className="sf-kpi-card">
          <div className="sf-kpi-label">Processing engine</div>
          <div className="sf-kpi-value" style={{ fontSize: 'var(--sf-fs-md)', color: 'var(--cd-secondary-accent, #7775E8)' }}>
            Local-First (Simulated)
          </div>
        </Card>
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body"><SkeletonRows rows={5} height={44} /></div>
        ) : !data?.rows.length ? (
          <EmptyState
            title="No payment records found"
            description="Payments will appear here when recorded against issued invoices or booking checkouts."
          />
        ) : (
          <>
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>Date & time</th>
                    <th>Customer</th>
                    <th>Invoice reference</th>
                    <th>Payment method</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((p) => {
                    const isSuccess = p.status === 'successful';
                    return (
                      <tr key={p.id}>
                        <td className="sf-text-xs sf-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          <div>{formatDateTime(p.created_at)}</div>
                          {p.reference && (
                            <span style={{ fontFamily: 'var(--cd-font-mono, monospace)', fontSize: '11px', color: 'var(--cd-secondary-text, #747B88)' }}>
                              {p.reference}
                            </span>
                          )}
                        </td>
                        <td>
                          {p.customer ? (
                            <Link to={`/app/customers/${p.customer.id}`} style={{ fontWeight: 600, color: 'var(--cd-primary-dark, #171B24)', textDecoration: 'none' }}>
                              {p.customer.full_name}
                            </Link>
                          ) : (
                            <span className="sf-muted">Guest</span>
                          )}
                        </td>
                        <td>
                          {p.invoice ? (
                            <Link
                              to={`/app/invoices/${p.invoice.id}`}
                              className="sf-flex sf-items-center sf-gap-1"
                              style={{ color: 'var(--cd-secondary-accent, #7775E8)', fontWeight: 700, fontFamily: 'var(--cd-font-mono, monospace)', textDecoration: 'none' }}
                            >
                              {p.invoice.invoice_number}
                              <ArrowRight size={12} />
                            </Link>
                          ) : (
                            <span className="sf-muted">—</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 'var(--sf-fs-sm)', fontWeight: 500 }}>
                            {PAYMENT_METHOD_LABELS[p.method] || p.method}
                          </span>
                        </td>
                        <td>
                          <Badge tone={isSuccess ? 'success' : p.status === 'failed' ? 'danger' : 'warning'}>
                            {isSuccess ? (
                              <CheckCircle2 size={11} style={{ marginRight: 3, display: 'inline' }} />
                            ) : (
                              <AlertCircle size={11} style={{ marginRight: 3, display: 'inline' }} />
                            )}
                            {p.status}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: isSuccess ? 'var(--cd-primary-dark, #171B24)' : 'var(--cd-danger, #D75C5C)' }}>
                          {formatMoney(p.amount, currentBusiness?.currency)}
                        </td>
                      </tr>
                    );
                  })}
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
