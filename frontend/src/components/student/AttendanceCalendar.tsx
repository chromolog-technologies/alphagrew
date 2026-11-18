import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  fetchStudentAttendanceCalendar,
  type AttendanceCalendar as CalendarData,
  type AttendanceCalendarDay,
  type AttendanceDayStatus,
} from '../../api/campusApi';
import { getStoredAuthToken } from '../../utils/auth';
import { Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_STYLES: Record<AttendanceDayStatus, { cell: string; dot: string; label: string }> = {
  present: { cell: 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100', dot: 'bg-emerald-500', label: 'Present' },
  partial: { cell: 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100', dot: 'bg-amber-500', label: 'Partly present' },
  absent: { cell: 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100', dot: 'bg-rose-500', label: 'Absent' },
  leave: { cell: 'bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100', dot: 'bg-sky-500', label: 'On leave' },
  none: { cell: 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50', dot: 'bg-slate-300', label: 'No record' },
};

const SESSION_BADGE: Record<string, 'success' | 'destructive' | 'warning' | 'info' | 'secondary'> = {
  present: 'success',
  absent: 'destructive',
  late: 'warning',
  leave: 'info',
};

/** "2026-03" for a local date. */
export function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Cells for a Monday-first month grid: null for the blanks before the 1st and after the last day. */
export function monthGrid(month: string): (string | null)[] {
  const [year, m] = month.split('-').map(Number);
  const monthIndex = m - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(dateKey(year, monthIndex, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split('-').map(Number);
  return monthKey(new Date(year, m - 1 + delta, 1));
}

function formatMonth(month: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatDay(date: string) {
  const [year, m, d] = date.split('-').map(Number);
  return new Date(year, m - 1, d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function sessionLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Month calendar of the signed-in student's attendance. Each day is coloured by its overall
 * status; choosing a day lists its sessions. Optional subjectId narrows it to one subject.
 */
export function AttendanceCalendar({ subjectId, subjectName }: { subjectId?: number | null; subjectName?: string | null }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [month, setMonth] = useState(() => monthKey(today));
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredAuthToken();
    if (!token) {
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchStudentAttendanceCalendar(token, month, subjectId)
      .then((response) => {
        if (!cancelled) setData(response.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the attendance calendar.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month, subjectId]);

  // Show today's details when viewing this month, otherwise nothing until a day is chosen.
  useEffect(() => {
    setSelected(month === monthKey(today) ? todayKey : null);
  }, [month, today, todayKey]);

  const byDate = useMemo(() => new Map((data?.days ?? []).map((day) => [day.date, day])), [data]);
  const cells = useMemo(() => monthGrid(month), [month]);
  const selectedDay: AttendanceCalendarDay | undefined = selected ? byDate.get(selected) : undefined;
  const summary = data?.month === month ? data.summary : null;
  const isCurrentMonth = month === monthKey(today);

  return (
    <Card className="rounded-2xl border-slate-200/90 shadow-xs">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CalendarDays size={18} className="text-blue-600" />
              Attendance calendar
            </CardTitle>
            <p className="mt-0.5 text-xs text-slate-500">
              {subjectName ? `Showing ${subjectName} only` : 'All subjects'} · choose a day to see each session
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 w-8 rounded-xl p-0" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month">
              <ChevronLeft size={16} />
            </Button>
            <p className="min-w-[9.5rem] text-center text-sm font-bold text-slate-900" aria-live="polite">
              {formatMonth(month)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-xl p-0"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={isCurrentMonth}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </Button>
            {!isCurrentMonth && (
              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs font-semibold" onClick={() => setMonth(monthKey(today))}>
                This month
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-0">
        {error ? (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle size={18} />
            <AlertTitle>Could not load the calendar</AlertTitle>
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="This month" value={summary?.percentage == null ? '—' : `${summary.percentage}%`} tone="text-blue-700" />
              <Stat label="Present" value={summary ? summary.present + summary.late : '—'} tone="text-emerald-700" />
              <Stat label="Absent" value={summary?.absent ?? '—'} tone="text-rose-700" />
              <Stat label="Leave" value={summary?.leave ?? '—'} tone="text-sky-700" />
            </div>

            <div>
              <div className="mb-1.5 grid grid-cols-7 gap-1.5" aria-hidden="true">
                {WEEKDAYS.map((day) => (
                  <p key={day} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {day}
                  </p>
                ))}
              </div>
              {loading ? (
                <Skeleton className="h-72 rounded-xl" />
              ) : (
                <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={`Attendance for ${formatMonth(month)}`}>
                  {cells.map((date, index) => {
                    if (!date) return <div key={`blank-${index}`} aria-hidden="true" />;
                    const day = byDate.get(date);
                    const status: AttendanceDayStatus = day?.status ?? 'none';
                    const style = DAY_STYLES[status];
                    const future = date > todayKey;
                    const isSelected = selected === date;
                    const attended = day ? day.present + day.late : 0;
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelected(date)}
                        aria-pressed={isSelected}
                        aria-label={`${formatDay(date)}: ${day ? `${style.label}, ${attended} of ${day.total} sessions attended` : 'no attendance recorded'}`}
                        className={[
                          'flex min-h-14 flex-col items-start justify-between rounded-xl border p-1.5 text-left transition sm:min-h-16 sm:p-2',
                          style.cell,
                          future ? 'opacity-50' : '',
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : '',
                          date === todayKey ? 'font-black' : '',
                        ].join(' ')}
                      >
                        <span className="text-xs sm:text-sm">{Number(date.slice(8))}</span>
                        {day && (
                          <span className="flex items-center gap-1 text-[10px] font-semibold sm:text-[11px]">
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                            {attended}/{day.total}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-600" aria-label="Legend">
              {(['present', 'partial', 'absent', 'leave', 'none'] as const).map((status) => (
                <li key={status} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${DAY_STYLES[status].dot}`} aria-hidden="true" />
                  {DAY_STYLES[status].label}
                </li>
              ))}
            </ul>

            {selected && !loading && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4" aria-live="polite">
                <p className="text-sm font-bold text-slate-900">{formatDay(selected)}</p>
                {selectedDay ? (
                  <ul className="mt-3 space-y-2">
                    {selectedDay.sessions.map((session) => (
                      <li key={session.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs shadow-xs">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{session.subject ?? 'Subject'}</p>
                          <p className="truncate text-slate-500">
                            {[session.subject_code, session.marked_by && `marked by ${session.marked_by}`, session.remarks].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <Badge variant={SESSION_BADGE[session.status] ?? 'secondary'}>{sessionLabel(session.status)}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    {selected > todayKey ? 'This day has not happened yet.' : 'No attendance was recorded on this day.'}
                  </p>
                )}
              </div>
            )}

            {!loading && data && data.days.length === 0 && (
              <p className="text-center text-xs text-slate-500">No attendance has been recorded for {formatMonth(month)} yet.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg font-black ${tone}`}>{value}</p>
    </div>
  );
}

export default AttendanceCalendar;
