import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button, IconButton } from '../../components/common/Button';
import { Field, Input } from '../../components/common/FormField';
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

export default function StaffDetail() {
  const { id } = useParams();
  const { currentBusiness } = useBusiness();
  const toast = useToast();
  const { data: member, isLoading } = useStaffMember(id);
  const { data: services } = useServices(currentBusiness?.id, { activeOnly: true });
  const assignServices = useAssignServices(currentBusiness?.id);
  const setAvailability = useSetAvailability(currentBusiness?.id);
  const addBlocked = useAddBlockedTime(currentBusiness?.id);
  const removeBlocked = useRemoveBlockedTime();

  const [selectedServices, setSelectedServices] = useState([]);
  const [windows, setWindows] = useState({});
  const [showBlock, setShowBlock] = useState(false);

  useEffect(() => {
    if (!member) return;
    setSelectedServices(member.services || []);
    const w = {};
    (member.availability || []).forEach((a) => { w[a.weekday] = { start: a.start_time.slice(0, 5), end: a.end_time.slice(0, 5), active: a.active }; });
    setWindows(w);
  }, [member]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(blockedTimeSchema) });

  if (isLoading) return <SkeletonRows rows={4} height={70} />;
  if (!member) return <p>Staff member not found.</p>;

  function toggleService(sid) {
    setSelectedServices((prev) => prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]);
  }

  async function saveServices() {
    try {
      await assignServices.mutateAsync({ memberId: id, serviceIds: selectedServices });
      toast.success('Services updated');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  function toggleDay(weekday) {
    setWindows((prev) => ({ ...prev, [weekday]: prev[weekday]?.active ? { ...prev[weekday], active: false } : { start: '09:00', end: '17:00', active: true } }));
  }

  function updateWindow(weekday, field, value) {
    setWindows((prev) => ({ ...prev, [weekday]: { ...prev[weekday], [field]: value } }));
  }

  async function saveAvailability() {
    const rules = Object.entries(windows).filter(([, w]) => w.active).map(([weekday, w]) => ({ weekday: Number(weekday), start_time: w.start, end_time: w.end, active: true }));
    try {
      await setAvailability.mutateAsync({ memberId: id, rules });
      toast.success('Availability updated');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function onAddBlock(values) {
    try {
      await addBlocked.mutateAsync({ memberId: id, payload: { start_at: new Date(values.startAt).toISOString(), end_at: new Date(values.endAt).toISOString(), reason: values.reason } });
      toast.success('Blocked time added');
      reset();
      setShowBlock(false);
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  async function onRemoveBlock(blockId) {
    try {
      await removeBlocked.mutateAsync(blockId);
      toast.success('Removed');
    } catch (err) {
      toast.error(toFriendlyError(err));
    }
  }

  return (
    <div>
      <Link to="/app/staff" className="sf-flex sf-items-center sf-gap-1 sf-text-sm sf-mb-4" style={{ color: 'var(--sf-brand-600)', fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back to staff
      </Link>

      <div className="sf-app-page-header">
        <div className="sf-flex sf-items-center sf-gap-3">
          <span className="sf-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>{initials(member.profile?.full_name || 'S')}</span>
          <div>
            <h1 className="sf-app-page-title">{member.profile?.full_name}</h1>
            <p className="sf-muted" style={{ textTransform: 'capitalize' }}>{member.role}</p>
          </div>
        </div>
      </div>

      <div className="sf-detail-grid">
        <div className="sf-flex-col sf-gap-4">
          <Card>
            <CardHeader title="Services performed" action={<Button size="sm" onClick={saveServices} loading={assignServices.isPending}>Save</Button>} />
            <CardBody>
              {!services?.length ? <p className="sf-muted sf-text-sm">No active services to assign.</p> : (
                <div className="sf-flex-col sf-gap-2">
                  {services.map((s) => (
                    <label key={s.id} className="sf-checkbox-row">
                      <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleService(s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Weekly availability" action={<Button size="sm" onClick={saveAvailability} loading={setAvailability.isPending}>Save</Button>} />
            <CardBody>
              {WEEKDAYS.map((d) => (
                <div key={d.value} className="sf-avail-row">
                  <label className="sf-checkbox-row sf-avail-day-label">
                    <input type="checkbox" checked={Boolean(windows[d.value]?.active)} onChange={() => toggleDay(d.value)} />
                    {d.short}
                  </label>
                  {windows[d.value]?.active && (
                    <>
                      <Input type="time" value={windows[d.value].start} onChange={(e) => updateWindow(d.value, 'start', e.target.value)} style={{ maxWidth: 130 }} />
                      <span className="sf-muted">to</span>
                      <Input type="time" value={windows[d.value].end} onChange={(e) => updateWindow(d.value, 'end', e.target.value)} style={{ maxWidth: 130 }} />
                    </>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Blocked times" action={<Button size="sm" variant="secondary" onClick={() => setShowBlock(true)}><Plus size={14} />Add</Button>} />
          <CardBody>
            {!member.blockedTimes?.length ? <p className="sf-muted sf-text-sm">No blocked times.</p> : (
              <div className="sf-flex-col sf-gap-2">
                {member.blockedTimes.map((b) => (
                  <div key={b.id} className="sf-flex sf-items-center sf-justify-between sf-row-card" style={{ flexDirection: 'row' }}>
                    <div>
                      <div className="sf-text-sm" style={{ fontWeight: 700 }}>{formatDateTime(b.start_at)}</div>
                      <div className="sf-text-xs sf-muted">until {formatDateTime(b.end_at)} {b.reason && `· ${b.reason}`}</div>
                    </div>
                    <IconButton label="Remove" onClick={() => onRemoveBlock(b.id)}><Trash2 size={14} /></IconButton>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={showBlock} onClose={() => setShowBlock(false)} title="Add blocked time">
        <form onSubmit={handleSubmit(onAddBlock)} noValidate>
          <Field label="Start" required error={errors.startAt?.message} htmlFor="startAt">
            <Input id="startAt" type="datetime-local" error={!!errors.startAt} {...register('startAt')} />
          </Field>
          <Field label="End" required error={errors.endAt?.message} htmlFor="endAt">
            <Input id="endAt" type="datetime-local" error={!!errors.endAt} {...register('endAt')} />
          </Field>
          <Field label="Reason" error={errors.reason?.message} htmlFor="reason">
            <Input id="reason" {...register('reason')} />
          </Field>
          <Button type="submit" variant="primary" block loading={addBlocked.isPending}>Add blocked time</Button>
        </form>
      </Modal>
    </div>
  );
}
