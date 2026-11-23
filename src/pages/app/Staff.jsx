import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Plus, Shield, ShieldCheck, User } from 'lucide-react';
import { Card, CardBody } from '../../components/common/Card';
import { Field, Input, Select } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useStaffList, useInviteMember } from '../../features/staff/hooks';
import { staffInviteSchema } from '../../schemas/staff';
import { initials } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import './app-pages.css';

const ROLE_ICON = { owner: ShieldCheck, admin: Shield, staff: User };

export default function Staff() {
  const { currentBusiness } = useBusiness();
  const toast = useToast();
  const { data: staff, isLoading } = useStaffList(currentBusiness?.id);
  const inviteMember = useInviteMember(currentBusiness?.id);
  const [showInvite, setShowInvite] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(staffInviteSchema), defaultValues: { role: 'staff' } });

  async function onSubmit(values) {
    try {
      await inviteMember.mutateAsync(values);
      toast.success(`Invitation recorded for ${values.email}. They will gain access once they sign up and accept.`);
      reset();
      setShowInvite(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Staff</h1>
          <p className="sf-muted">Team members with access to {currentBusiness?.name}.</p>
        </div>
        <Button variant="primary" onClick={() => setShowInvite(true)}><Plus size={16} />Invite staff</Button>
      </div>

      {isLoading ? <SkeletonRows rows={3} height={70} /> : !staff?.length ? (
        <EmptyState title="No team members yet" />
      ) : (
        <div className="sf-card-list">
          {staff.map((m) => {
            const RoleIcon = ROLE_ICON[m.role] || User;
            return (
              <Link key={m.id} to={`/app/staff/${m.id}`} style={{ textDecoration: 'none' }}>
                <Card>
                  <CardBody className="sf-flex sf-items-center sf-justify-between">
                    <div className="sf-flex sf-items-center sf-gap-3">
                      <span className="sf-avatar" style={{ background: 'var(--cd-primary-dark, #171B24)', color: 'var(--cd-accent-lime, #C7F36B)' }}>
                        {initials(m.profile?.full_name || 'S')}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark, #171B24)' }}>{m.profile?.full_name}</div>
                        <div className="sf-text-xs sf-muted">{m.services?.length || 0} services assigned</div>
                      </div>
                    </div>
                    <span className={`sf-badge sf-badge-${m.role === 'owner' ? 'accent' : m.role === 'admin' ? 'info' : 'neutral'}`}>
                      <RoleIcon size={12} style={{ marginRight: 4 }} />{m.role}
                    </span>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite staff member">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Field label="Email" required error={errors.email?.message} htmlFor="email">
            <Input id="email" type="email" error={!!errors.email} {...register('email')} />
          </Field>
          <Field label="Role" required htmlFor="role">
            <Select id="role" {...register('role')}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <p className="sf-text-xs sf-muted sf-mb-4">
            This records a pending invitation. In a full deployment, this would trigger an email; the invitee gains
            workspace access after they sign up and the invitation is accepted.
          </p>
          <Button type="submit" variant="primary" block loading={inviteMember.isPending}>Send invitation</Button>
        </form>
      </Modal>
    </div>
  );
}
