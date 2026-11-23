import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarClock, Plus, Filter } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { Modal } from '../../components/common/Modal';
import { useBusiness } from '../../features/business/BusinessContext';
import { useAppointmentsInRange } from '../../features/appointments/hooks';
import { useStaffList } from '../../features/staff/hooks';
import { formatDate, formatTime } from '../../utils/format';
import { APPOINTMENT_STATUS_META } from '../../constants/status';
import NewAppointmentForm from './components/NewAppointmentForm';
import './app-pages.css';

export default function Calendar() {
  const { currentBusiness } = useBusiness();
  const navigate = useNavigate();
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(new Date());
  const [staffFilter, setStaffFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  const { data: staffList } = useStaffList(currentBusiness?.id);

  const rangeStart = view === 'week' ? startOfWeek(anchor) : new Date(new Date(anchor).setHours(0, 0, 0, 0));
  const rangeEnd = view === 'week' ? endOfWeek(anchor) : new Date(new Date(anchor).setHours(23, 59, 59, 999));

  const { data: appts, isLoading } = useAppointmentsInRange(
    currentBusiness?.id,
    rangeStart,
    rangeEnd,
    staffFilter ? { staffMemberId: staffFilter } : {}
  );

  const days = useMemo(() => {
    if (view === 'day') return [anchor];
    return Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(anchor), i));
  }, [anchor, view]);

  function shift(dir) {
    if (view === 'week') setAnchor((a) => (dir > 0 ? addWeeks(a, 1) : subWeeks(a, 1)));
    else setAnchor((a) => addDays(a, dir));
  }

  return (
    <div>
      <div className="sf-app-page-header">
        <div>
          <h1 className="sf-app-page-title">Calendar & Schedule</h1>
          <p className="sf-muted">
            {formatDate(rangeStart, 'MMM d')} &ndash; {formatDate(rangeEnd, 'MMM d, yyyy')}
          </p>
        </div>

        <div className="sf-flex sf-gap-2" style={{ flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => setShowNew(true)}>
            <Plus size={16} /> New appointment
          </Button>

          <div className="sf-flex sf-items-center sf-gap-2">
            <Select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              style={{ maxWidth: 190, background: 'var(--cd-surface)' }}
            >
              <option value="">All staff members</option>
              {staffList?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profile?.full_name}
                </option>
              ))}
            </Select>

            <Select
              value={view}
              onChange={(e) => setView(e.target.value)}
              style={{ maxWidth: 120, background: 'var(--cd-surface)' }}
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Date Navigation Strip */}
      <div className="sf-flex sf-items-center sf-justify-between sf-mb-5" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="sf-flex sf-items-center sf-gap-2">
          <Button variant="secondary" size="sm" onClick={() => shift(-1)} title="Previous">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shift(1)} title="Next">
            <ChevronRight size={16} />
          </Button>
          <span style={{ fontWeight: 700, marginLeft: 8, fontSize: 'var(--sf-fs-sm)', color: 'var(--cd-primary-dark)' }}>
            {view === 'week'
              ? `${formatDate(rangeStart, 'MMMM d')} – ${formatDate(rangeEnd, 'd, yyyy')}`
              : formatDate(anchor, 'EEEE, MMMM d, yyyy')}
          </span>
        </div>

        {staffFilter && (
          <div className="sf-flex sf-items-center sf-gap-2 sf-text-xs sf-muted">
            <Filter size={13} />
            <span>Filtered to single staff member</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} height={70} />
      ) : (
        <div className="sf-flex-col sf-gap-4">
          {days.map((day) => {
            const isToday = isSameDay(day, new Date());
            const dayAppts = (appts || [])
              .filter((a) => isSameDay(new Date(a.start_at), day))
              .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

            return (
              <Card
                key={day.toISOString()}
                padded
                style={{
                  borderLeft: isToday ? '4px solid var(--cd-accent-lime)' : undefined,
                  background: isToday ? 'var(--cd-surface)' : undefined,
                }}
              >
                <div className="sf-flex sf-justify-between sf-items-center sf-mb-3">
                  <div className="sf-flex sf-items-center sf-gap-2">
                    <CalendarClock size={16} color="var(--cd-primary-dark)" />
                    <strong style={{ color: 'var(--cd-primary-dark)', fontSize: 'var(--sf-fs-sm)' }}>
                      {formatDate(day, 'EEEE, MMM d')}
                    </strong>
                    {isToday && (
                      <span className="sf-badge sf-badge-accent" style={{ fontSize: 10 }}>
                        Today
                      </span>
                    )}
                  </div>
                  <span className="sf-badge sf-badge-neutral cd-num">
                    {dayAppts.length} {dayAppts.length === 1 ? 'appointment' : 'appointments'}
                  </span>
                </div>

                {dayAppts.length === 0 ? (
                  <p className="sf-muted sf-text-sm" style={{ padding: '0.5rem 0' }}>
                    No appointments scheduled.
                  </p>
                ) : (
                  <div className="sf-cal-day-list">
                    {dayAppts.map((a) => {
                      const meta = APPOINTMENT_STATUS_META[a.status];
                      return (
                        <div
                          key={a.id}
                          className="sf-cal-day-item"
                          onClick={() => navigate(`/app/appointments/${a.id}`)}
                        >
                          <div className="sf-cal-day-time cd-num">
                            {formatTime(a.start_at)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'var(--cd-primary-dark)' }}>
                              {a.service?.name}
                            </div>
                            <div className="sf-text-xs sf-muted sf-mt-1">
                              <span>{a.customer?.full_name}</span> &middot;{' '}
                              <span>with {a.staff?.profile?.full_name}</span>
                            </div>
                          </div>
                          <span className={`sf-badge sf-badge-${meta?.tone || 'neutral'}`}>
                            {meta?.label || a.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}

          {days.every((day) => (appts || []).filter((a) => isSameDay(new Date(a.start_at), day)).length === 0) && (
            <EmptyState
              title="No bookings in this period"
              description="Navigate forward or backward, or create a new appointment manually."
            />
          )}
        </div>
      )}

      {/* New Appointment Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Appointment" wide>
        <NewAppointmentForm onDone={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}
