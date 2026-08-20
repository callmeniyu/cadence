import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { Field, Input, Textarea } from '../../components/common/FormField';
import { Button, IconButton } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../../features/services/hooks';
import { serviceSchema } from '../../schemas/service';
import { formatMoney, formatDuration } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import './app-pages.css';

const DEFAULTS = { name: '', category: '', description: '', durationMinutes: 30, price: 0, bufferBeforeMinutes: 0, bufferAfterMinutes: 0, color: '#3a63f0', active: true, publicVisible: true };

export default function Services() {
  const { currentBusiness } = useBusiness();
  const toast = useToast();
  const { data: services, isLoading } = useServices(currentBusiness?.id);
  const createService = useCreateService(currentBusiness?.id);
  const updateService = useUpdateService(currentBusiness?.id);
  const deleteService = useDeleteService(currentBusiness?.id);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit
  const [toDelete, setToDelete] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(serviceSchema), defaultValues: DEFAULTS });

  function openNew() { reset(DEFAULTS); setEditing({}); }
  function openEdit(s) {
    reset({
      name: s.name, category: s.category || '', description: s.description || '',
      durationMinutes: s.duration_minutes, price: s.price, bufferBeforeMinutes: s.buffer_before_minutes,
      bufferAfterMinutes: s.buffer_after_minutes, color: s.color, active: s.active, publicVisible: s.public_visible,
    });
    setEditing(s);
  }

  async function onSubmit(values) {
    const payload = {
      name: values.name, category: values.category, description: values.description,
      duration_minutes: values.durationMinutes, price: values.price,
      buffer_before_minutes: values.bufferBeforeMinutes, buffer_after_minutes: values.bufferAfterMinutes,
      color: values.color, active: values.active, public_visible: values.publicVisible,
    };
    try {
      if (editing?.id) await updateService.mutateAsync({ id: editing.id, patch: payload });
      else await createService.mutateAsync(payload);
      toast.success(editing?.id ? 'Service updated' : 'Service created');
      setEditing(null);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function confirmDelete() {
    try {
      await deleteService.mutateAsync(toDelete.id);
      toast.success('Service removed');
    } catch (err) {
      toast.error(toFriendlyError(err));
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Services</h1>
          <p className="sf-muted">Manage what customers can book.</p>
        </div>
        <Button variant="primary" onClick={openNew}><Plus size={16} />New service</Button>
      </div>

      {isLoading ? <SkeletonRows rows={3} height={90} /> : !services?.length ? (
        <EmptyState title="No services yet" description="Add your first bookable service to start accepting appointments." />
      ) : (
        <div className="sf-card-list">
          {services.map((s) => (
            <Card key={s.id}>
              <CardBody className="sf-flex sf-items-center sf-justify-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                <div className="sf-flex sf-items-center sf-gap-3" style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ width: 6, height: 44, borderRadius: 3, background: s.color }} />
                  <div>
                    <div className="sf-flex sf-items-center sf-gap-2">
                      <strong>{s.name}</strong>
                      {!s.active && <span className="sf-badge sf-badge-neutral">Archived</span>}
                      {s.active && !s.public_visible && <span className="sf-badge sf-badge-warning">Hidden</span>}
                    </div>
                    <div className="sf-row-card-meta sf-mt-2">
                      <span className="sf-flex sf-items-center sf-gap-1"><Clock size={12} />{formatDuration(s.duration_minutes)}</span>
                      <span>{formatMoney(s.price, currentBusiness?.currency)}</span>
                      {s.category && <span>{s.category}</span>}
                    </div>
                  </div>
                </div>
                <div className="sf-flex sf-gap-2">
                  <IconButton label="Edit" onClick={() => openEdit(s)}><Pencil size={16} /></IconButton>
                  <IconButton label="Delete" onClick={() => setToDelete(s)}><Trash2 size={16} /></IconButton>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit service' : 'New service'} wide>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Name" required error={errors.name?.message} htmlFor="name">
            <Input id="name" error={!!errors.name} {...register('name')} />
          </Field>
          <div className="sf-grid-2">
            <Field label="Category" error={errors.category?.message} htmlFor="category">
              <Input id="category" {...register('category')} />
            </Field>
            <Field label="Color" htmlFor="color">
              <Input id="color" type="color" {...register('color')} style={{ height: 42, padding: 4 }} />
            </Field>
          </div>
          <Field label="Description" error={errors.description?.message} htmlFor="description">
            <Textarea id="description" rows={3} {...register('description')} />
          </Field>
          <div className="sf-grid-2">
            <Field label="Duration (minutes)" required error={errors.durationMinutes?.message} htmlFor="durationMinutes">
              <Input id="durationMinutes" type="number" min="5" error={!!errors.durationMinutes} {...register('durationMinutes')} />
            </Field>
            <Field label="Price" required error={errors.price?.message} htmlFor="price">
              <Input id="price" type="number" step="0.01" min="0" error={!!errors.price} {...register('price')} />
            </Field>
          </div>
          <div className="sf-grid-2">
            <Field label="Buffer before (min)" error={errors.bufferBeforeMinutes?.message} htmlFor="bufferBeforeMinutes">
              <Input id="bufferBeforeMinutes" type="number" min="0" {...register('bufferBeforeMinutes')} />
            </Field>
            <Field label="Buffer after (min)" error={errors.bufferAfterMinutes?.message} htmlFor="bufferAfterMinutes">
              <Input id="bufferAfterMinutes" type="number" min="0" {...register('bufferAfterMinutes')} />
            </Field>
          </div>
          <div className="sf-flex sf-gap-4 sf-mb-4">
            <label className="sf-checkbox-row"><input type="checkbox" {...register('active')} /> Active</label>
            <label className="sf-checkbox-row"><input type="checkbox" {...register('publicVisible')} /> Visible on booking page</label>
          </div>
          <Button type="submit" variant="primary" block loading={createService.isPending || updateService.isPending}>
            {editing?.id ? 'Save changes' : 'Create service'}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove this service?"
        description="If this service has past appointments it will be archived instead of deleted."
        confirmLabel="Remove"
        loading={deleteService.isPending}
      />
    </div>
  );
}
