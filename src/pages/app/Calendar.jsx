import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Select } from '../../components/common/FormField';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonRows } from '../../components/common/Skeleton';
import { useBusiness } from '../../features/business/BusinessContext';
import { useAppointmentsInRange } from '../../features/appointments/hooks';
import { useStaffList } from '../../features/staff/hooks';
import { formatDate, formatTime } from '../../utils/format';
import { APPOINTMENT_STATUS_META } from '../../constants/status';
import './app-pages.css';

export default function Calendar() {
  const { currentBusiness } = useBusiness();
  const navigate = useNavigate();
  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(new Date());
  const [staffFilter, setStaffFilter] = useState('');

  const { data: staffList } = useStaffList(currentBusiness?.id);

  const rangeStart = view === 'week' ? startOfWeek(anchor) : new Date(anchor.setHours(0, 0, 0, 0));
  const rangeEnd = view === 'week' ? endOfWeek(anchor) : new Date(new Date(anchor).setHours(23, 59, 59, 999));

  const { data: appts, isLoading } = useAppointmentsInRange(currentBusiness?.id, rangeStart, rangeEnd, staffFilter ? { staffMemberId: staffFilter } : {});

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
          <h1 className="sf-app-page-title">Calendar</h1>
          <p className="sf-muted">{formatDate(rangeStart, 'MMM d')} &ndash; {formatDate(rangeEnd, 'MMM d, yyyy')}</p>
        </div>
        <div className="sf-flex sf-gap-2">
          <Select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">All staff</option>
            {staffList?.map((m) => <option key={m.id} value={m.id}>{m.profile?.full_name}</option>)}
          </Select>
          <Select value={view} onChange={(e) => setView(e.target.value)} style={{ maxWidth: 130 }}>
            <option value="day">Day</option>
            <option value="week">Week</option>
          </Select>
        </div>
      </div>

      <div className="sf-flex sf-items-center sf-gap-2 sf-mb-4">
        <Button variant="secondary" size="sm" onClick={() => shift(-1)}><ChevronLeft size={16} /></Button>
        <Button variant="secondary" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
        <Button variant="secondary" size="sm" onClick={() => shift(1)}><ChevronRight size={16} /></Button>
      </div>

      {isLoading ? <SkeletonRows rows={4} height={60} /> : (
        <div className="sf-flex-col sf-gap-5">
          {days.map((day) => {
            const dayAppts = (appts || []).filter((a) => isSameDay(new Date(a.start_at), day)).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
            return (
              <Card key={day.toISOString()} padded>
                <div className="sf-flex sf-items-center sf-gap-2 sf-mb-3">
                  <CalendarClock size={16} color="var(--sf-brand-500)" />
                  <strong>{formatDate(day, 'EEEE, MMM d')}</strong>
                  <span className="sf-badge sf-badge-neutral">{dayAppts.length}</span>
                </div>
                {dayAppts.length === 0 ? (
                  <p className="sf-muted sf-text-sm">No appointments.</p>
                ) : (
                  <div className="sf-cal-day-list">
                    {dayAppts.map((a) => {
                      const meta = APPOINTMENT_STATUS_META[a.status];
                      return (
                        <div key={a.id} className="sf-cal-day-item" onClick={() => navigate(`/app/appointments/${a.id}`)}>
                          <div className="sf-cal-day-time">{formatTime(a.start_at)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{a.service?.name}</div>
                            <div className="sf-text-xs sf-muted">{a.customer?.full_name} &middot; {a.staff?.profile?.full_name}</div>
                          </div>
                          <span className={`sf-badge sf-badge-${meta?.tone || 'neutral'}`}>{meta?.label || a.status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
          {days.every((day) => (appts || []).filter((a) => isSameDay(new Date(a.start_at), day)).length === 0) && (
            <EmptyState title="No appointments in this range" />
          )}
        </div>
      )}
    </div>
  );
}
