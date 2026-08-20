import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, Plus } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Input, Field, Textarea } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useCustomers, useCreateCustomer } from '../../features/customers/hooks';
import { customerSchema } from '../../schemas/customer';
import { formatMoney, formatDate, initials } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import './app-pages.css';

const PAGE_SIZE = 10;

export default function Customers() {
  const { currentBusiness } = useBusiness();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const toast = useToast();

  const { data, isLoading } = useCustomers(currentBusiness?.id, { search, page, pageSize: PAGE_SIZE });
  const createCustomer = useCreateCustomer(currentBusiness?.id);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(customerSchema) });

  async function onSubmit(values) {
    try {
      await createCustomer.mutateAsync(values);
      toast.success('Customer added');
      reset();
      setShowNew(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Customers</h1>
          <p className="sf-muted">Everyone who has booked with {currentBusiness?.name}.</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}><Plus size={16} />Add customer</Button>
      </div>

      <div className="sf-filter-bar">
        <div className="sf-search-input-wrap">
          <Search size={15} />
          <Input placeholder="Search name, email, phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="sf-card-body"><SkeletonRows rows={5} height={44} /></div>
        ) : !data?.rows.length ? (
          <EmptyState title="No customers yet" description="New customers appear here automatically after their first booking." />
        ) : (
          <>
            <div className="sf-table-wrap">
              <table className="sf-table">
                <thead><tr><th>Customer</th><th>Contact</th><th>Appointments</th><th>Total paid</th><th>Outstanding</th><th>Since</th></tr></thead>
                <tbody>
                  {data.rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/app/customers/${c.id}`} className="sf-flex sf-items-center sf-gap-2" style={{ color: 'var(--sf-brand-600)', fontWeight: 700 }}>
                          <span className="sf-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(c.full_name)}</span>
                          {c.full_name}
                        </Link>
                      </td>
                      <td className="sf-text-sm">{c.email}<br /><span className="sf-muted sf-text-xs">{c.phone}</span></td>
                      <td>{c.appointmentCount}</td>
                      <td>{formatMoney(c.totalPaid, currentBusiness?.currency)}</td>
                      <td>{c.outstanding > 0 ? <span style={{ color: 'var(--sf-danger-500)', fontWeight: 700 }}>{formatMoney(c.outstanding, currentBusiness?.currency)}</span> : '—'}</td>
                      <td className="sf-text-xs sf-muted">{formatDate(c.created_at)}</td>
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

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add customer">
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
          <Button type="submit" variant="primary" block loading={createCustomer.isPending}>Add customer</Button>
        </form>
      </Modal>
    </div>
  );
}
