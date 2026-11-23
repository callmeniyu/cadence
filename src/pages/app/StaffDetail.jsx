import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, Trash2, Clock, Check, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button, IconButton } from '../../components/common/Button';
import { Input, Field } from '../../components/common/FormField';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import { useBusiness } from '../../features/business/BusinessContext';
import { useStaffMember, useAssignServices, useSetAvailability, useAddBlockedTime, useRemoveBlockedTime } from '../../features/staff/hooks';
import { useServices } from '../../features/services/hooks';
import { blockedTimeSchema } from '../../schemas/staff';
import { WEEKDAYS } from '../../constants/status';
import { formatDateTime, initials } from '../../utils/format';
import { toFriendlyError } from '../../utils/errorMessages';
import './app-pages.css';

function StaffDetailEditor({ member, services, currentBusiness, id }) {
  const toast = useToast();
  const assignServices = useAssignServices(currentBusiness?.id);
  const setAvailability = useSetAvailability(currentBusiness?.id);
  const addBlocked = useAddBlockedTime(currentBusiness?.id);
  const removeBlocked = useRemoveBlockedTime();

  const [selectedServices, setSelectedServices] = useState(() => member.services || []);
  const [windows, setWindows] = useState(() => {
    const w = {};
    (member.availability || []).forEach((a) => {
      w[a.weekday] = { start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5), active: a.active };
    });
    return w;
  });
  const [showBlock, setShowBlock] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(blockedTimeSchema),
  });

  function toggleService(sid) {
    setSelectedServices((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);
  }

  async function saveServices() {
    try {
      await assignServices.mutateAsync({ memberId: id, serviceIds: selectedServices });
      toast.success('Assigned services updated');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  function toggleDay(weekday) {
    setWindows((prev) => ({
      ...prev,
      [weekday]: prev[weekday]?.active
        ? { ...prev[weekday], active: false }
        : { start: '09:00', end: '17:00', active: true },
    }));
  }

  function updateWindow(weekday, field, value) {
    setWindows((prev) => ({ ...prev, [weekday]: { ...prev[weekday], [field]: value } }));
  }

  async function saveAvailability() {
    const rules = Object.entries(windows)
      .filter(([, w]) => w && w.active)
      .map(([weekday, w]) => ({
        weekday: Number(weekday),
        start_time: w.start,
        end_time: w.end,
        active: true,
      }));
    try {
      await setAvailability.mutateAsync({ memberId: id, rules });
      toast.success('Weekly availability schedule saved');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function onAddBlock(values) {
    try {
      await addBlocked.mutateAsync({
        memberId: id,
        payload: {
          start_at: new Date(values.startAt).toISOString(),
          end_at: new Date(values.endAt).toISOString(),
          reason: values.reason,
        },
      });
      toast.success('Blocked time created');
      reset();
      setShowBlock(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function onRemoveBlock(blockId) {
    try {
      await removeBlocked.mutateAsync(blockId);
      toast.success('Blocked time removed');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <Link to="/app/staff" className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4" style={{ color: 'var(--cd-primary-dark, #171B24)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to staff roster
      </Link>

      <div className="sf-app-page-header">
        <div className="sf-flex sf-items-center sf-gap-3">
          <span className="sf-avatar" style={{ width: 48, height: 48, fontSize: 16, background: 'var(--cd-primary-dark, #171B24)', color: 'var(--cd-accent-lime, #C7F36B)' }}>
            {initials(member.profile?.full_name || 'Staff')}
          </span>
          <div>
            <h1 className="sf-app-page-title">{member.profile?.full_name}</h1>
            <p className="sf-muted sf-flex sf-items-center sf-gap-2 sf-text-xs">
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--cd-secondary-accent, #7775E8)' }}>
                {member.role}
              </span>
              <span>&middot;</span>
              <span>{member.profile?.email || 'No email registered'}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="sf-detail-grid">
        <div className="sf-flex-col sf-gap-4">
          {/* Services Performed */}
          <Card>
            <CardHeader
              title="Assigned services"
              subtitle="Services this staff member is authorized and qualified to provide"
              action={
                <Button size="sm" onClick={saveServices} loading={assignServices.isPending}>
                  <Check size={14} /> Save services
                </Button>
              }
            />
            <CardBody>
              {!services?.length ? (
                <p className="sf-muted sf-text-sm">No active services defined in the business catalog.</p>
              ) : (
                <div className="sf-flex-col sf-gap-2">
                  {services.map((s) => {
                    const isChecked = selectedServices.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="sf-checkbox-row sf-p-2"
                        style={{
                          borderRadius: 'var(--sf-radius-md)',
                          border: isChecked ? '1px solid var(--cd-accent-lime, #C7F36B)' : '1px solid var(--cd-border, #E5E8E1)',
                          background: isChecked ? 'rgba(199, 243, 107, 0.08)' : 'var(--cd-surface, #FFFFFF)',
                          transition: 'all var(--sf-transition)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleService(s.id)}
                        />
                        <div className="sf-flex sf-justify-between sf-items-center" style={{ width: '100%' }}>
                          <span style={{ fontWeight: 600, color: 'var(--cd-primary-text, #202531)' }}>{s.name}</span>
                          <span className="sf-text-xs sf-muted">{s.duration_minutes} min</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Weekly Availability */}
          <Card>
            <CardHeader
              title="Weekly working hours"
              subtitle="Determines booking slot calculation on the customer scheduling page"
              action={
                <Button size="sm" onClick={saveAvailability} loading={setAvailability.isPending}>
                  <Clock size={14} /> Save schedule
                </Button>
              }
            />
            <CardBody>
              <div className="sf-flex-col sf-gap-2">
                {WEEKDAYS.map((d) => {
                  const isActive = Boolean(windows[d.value]?.active);
                  return (
                    <div
                      key={d.value}
                      className="sf-avail-row sf-p-2"
                      style={{
                        borderRadius: 'var(--sf-radius-md)',
                        background: isActive ? 'var(--cd-surface, #FFFFFF)' : 'var(--cd-surface-subtle, #FAFBF9)',
                        border: '1px solid var(--cd-border, #E5E8E1)',
                      }}
                    >
                      <label className="sf-checkbox-row sf-avail-day-label">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => toggleDay(d.value)}
                        />
                        <span style={{ fontWeight: 700 }}>{d.label}</span>
                      </label>
                      {isActive ? (
                        <div className="sf-flex sf-items-center sf-gap-2">
                          <Input
                            type="time"
                            value={windows[d.value]?.start || '09:00'}
                            onChange={(e) => updateWindow(d.value, 'start', e.target.value)}
                            style={{ maxWidth: 120, fontVariantNumeric: 'tabular-nums' }}
                          />
                          <span className="sf-muted sf-text-xs">to</span>
                          <Input
                            type="time"
                            value={windows[d.value]?.end || '17:00'}
                            onChange={(e) => updateWindow(d.value, 'end', e.target.value)}
                            style={{ maxWidth: 120, fontVariantNumeric: 'tabular-nums' }}
                          />
                        </div>
                      ) : (
                        <span className="sf-text-xs sf-muted" style={{ fontStyle: 'italic' }}>Off duty</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Blocked Times Card */}
        <div className="sf-flex-col sf-gap-4">
          <Card>
            <CardHeader
              title="Blocked time / Time off"
              subtitle="Specific hours withheld from appointment availability"
              action={
                <Button size="sm" variant="secondary" onClick={() => setShowBlock(true)}>
                  <Plus size={14} /> Add block
                </Button>
              }
            />
            <CardBody>
              {!member.blockedTimes?.length ? (
                <p className="sf-muted sf-text-sm">No blocked times scheduled.</p>
              ) : (
                <div className="sf-flex-col sf-gap-2">
                  {member.blockedTimes.map((b) => (
                    <div
                      key={b.id}
                      className="sf-flex sf-items-center sf-justify-between sf-p-3"
                      style={{
                        background: 'var(--cd-surface-subtle, #FAFBF9)',
                        border: '1px solid var(--cd-border, #E5E8E1)',
                        borderRadius: 'var(--sf-radius-md)',
                      }}
                    >
                      <div>
                        <div className="sf-text-sm" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--cd-primary-dark, #171B24)' }}>
                          {formatDateTime(b.start_at)}
                        </div>
                        <div className="sf-text-xs sf-muted sf-mt-1">
                          until {formatDateTime(b.end_at)} {b.reason && `· ${b.reason}`}
                        </div>
                      </div>
                      <IconButton label="Remove blocked time" onClick={() => onRemoveBlock(b.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card padded>
            <h4 style={{ fontSize: 'var(--sf-fs-sm)', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--cd-primary-dark, #171B24)' }}>
              <ShieldCheck size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4, color: 'var(--cd-accent-lime, #C7F36B)' }} />
              Scheduling rule enforcement
            </h4>
            <p className="sf-text-xs sf-muted" style={{ lineHeight: 1.6 }}>
              Cadence strictly prevents double booking. When this staff member is assigned to an appointment or has a blocked period, the slot engine removes that time from public availability.
            </p>
          </Card>
        </div>
      </div>

      {/* Add Blocked Time Modal */}
      <Modal open={showBlock} onClose={() => setShowBlock(false)} title="Add blocked time / leave">
        <form onSubmit={handleSubmit(onAddBlock)} noValidate>
          <Field label="Start Date & Time" required error={errors.startAt?.message} htmlFor="startAt">
            <Input id="startAt" type="datetime-local" error={!!errors.startAt} {...register('startAt')} />
          </Field>
          <Field label="End Date & Time" required error={errors.endAt?.message} htmlFor="endAt">
            <Input id="endAt" type="datetime-local" error={!!errors.endAt} {...register('endAt')} />
          </Field>
          <Field label="Reason / Notes" error={errors.reason?.message} htmlFor="reason">
            <Input id="reason" placeholder="e.g. Vacation, Training, Doctor appointment" {...register('reason')} />
          </Field>
          <div className="sf-flex sf-gap-2 sf-mt-4">
            <Button type="button" variant="secondary" onClick={() => setShowBlock(false)} block>
              Cancel
            </Button>
            <Button type="submit" variant="primary" block loading={addBlocked.isPending}>
              Add blocked time
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function StaffDetail() {
  const { id } = useParams();
  const { currentBusiness } = useBusiness();
  const { data: member, isLoading } = useStaffMember(id);
  const { data: services } = useServices(currentBusiness?.id, { activeOnly: true });

  if (isLoading) return <SkeletonRows rows={4} height={70} />;
  if (!member) return <p className="sf-muted">Staff member not found.</p>;

  return (
    <StaffDetailEditor
      key={member.id}
      member={member}
      services={services}
      currentBusiness={currentBusiness}
      id={id}
    />
  );
}
