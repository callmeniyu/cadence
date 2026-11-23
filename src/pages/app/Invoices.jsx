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
import { INVOICE_STATUS_META } from '../../constants/status';
import './app-pages.css';

const PAGE_SIZE = 10;

export default function Invoices() {
  const { currentBusiness } = useBusiness();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInvoices(currentBusiness?.id, {
    search,
    status: status || undefined,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Invoices</h1>
          <p className="sf-muted">Customer billing statements, outstanding balances, and receipts.</p>
        </div>
      </div>

      <div className="sf-filter-bar">
        <div className="sf-search-input-wrap">
          <Search size={15} />
          <Input
            placeholder="Search invoice number or client..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body">
            <SkeletonRows rows={5} height={46} />
          </div>
        ) : !data?.rows.length ? (
          <EmptyState
            title="No invoices found"
            description="Invoices are created directly from completed or confirmed appointments."
          />
        ) : (
          <>
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Issued Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <Link
                          to={`/app/invoices/${inv.id}`}
                          style={{ color: 'var(--cd-primary-dark)', fontWeight: 700 }}
                          className="cd-num"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td>
                        {inv.customer ? (
                          <Link
                            to={`/app/customers/${inv.customer.id}`}
                            style={{ fontWeight: 600, color: 'var(--cd-primary-dark)' }}
                          >
                            {inv.customer.full_name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="cd-num sf-text-xs sf-muted">
                        {inv.issued_at ? formatDate(inv.issued_at) : 'Draft'}
                      </td>
                      <td>
                        <StatusBadge status={inv.status} meta={INVOICE_STATUS_META} />
                      </td>
                      <td className="cd-num" style={{ fontWeight: 700 }}>
                        {formatMoney(inv.total, currentBusiness?.currency)}
                      </td>
                      <td className="cd-num">
                        {inv.balance > 0 ? (
                          <span style={{ color: '#B5791E', fontWeight: 700 }}>
                            {formatMoney(inv.balance, currentBusiness?.currency)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--cd-success)', fontWeight: 600 }}>Paid in full</span>
                        )}
                      </td>
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
