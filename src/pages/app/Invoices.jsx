import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Input, Select } from '../../components/common/FormField';
import { StatusBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import { useBusiness } from '../../features/business/BusinessContext';
import { useInvoices } from '../../features/invoices/hooks';
import { formatMoney, formatDate } from '../../utils/format';
import { INVOICE_STATUS, INVOICE_STATUS_META } from '../../constants/status';
import './app-pages.css';

const PAGE_SIZE = 10;

export default function Invoices() {
  const { currentBusiness } = useBusiness();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInvoices(currentBusiness?.id, { search, status: status || undefined, page, pageSize: PAGE_SIZE });

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Invoices</h1>
          <p className="sf-muted">Generated from completed appointments.</p>
        </div>
      </div>

      <div className="sf-filter-bar">
        <div className="sf-search-input-wrap">
          <Search size={15} />
          <Input placeholder="Search invoice # or customer" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {Object.values(INVOICE_STATUS).map((s) => <option key={s} value={s}>{INVOICE_STATUS_META[s].label}</option>)}
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body"><SkeletonRows rows={5} height={44} /></div>
        ) : !data?.rows.length ? (
          <EmptyState title="No invoices yet" description="Create an invoice from a completed appointment to see it here." />
        ) : (
          <>
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead><tr><th>Invoice #</th><th>Customer</th><th>Total</th><th>Balance</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {data.rows.map((inv) => (
                    <tr key={inv.id}>
                      <td><Link to={`/app/invoices/${inv.id}`} style={{ color: 'var(--sf-brand-600)', fontWeight: 700 }}>{inv.invoice_number}</Link></td>
                      <td>{inv.customer?.full_name}</td>
                      <td>{formatMoney(inv.total, currentBusiness?.currency)}</td>
                      <td>{formatMoney(inv.balance, currentBusiness?.currency)}</td>
                      <td><StatusBadge status={inv.status} meta={INVOICE_STATUS_META} /></td>
                      <td className="sf-text-xs sf-muted">{formatDate(inv.created_at)}</td>
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
