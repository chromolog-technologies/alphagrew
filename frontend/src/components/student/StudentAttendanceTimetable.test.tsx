import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signInAs } from '../../test/mockFetch';
import { AttendanceCalendar, monthGrid } from './AttendanceCalendar';
import { StudentAttendanceView } from './StudentAttendanceView';
import { StudentTimetableView } from './StudentTimetableView';

/** Answers each request by the first matching path fragment. */
function routeFetch(routes: Record<string, unknown>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = Object.keys(routes).find((fragment) => url.includes(fragment));
    return new Response(JSON.stringify(match ? routes[match] : { message: 'Not found' }), {
      status: match ? 200 : 404,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const MARCH = {
  success: true,
  data: {
    month: '2026-03',
    from: '2026-03-01',
    to: '2026-03-31',
    summary: { total: 3, present: 1, absent: 1, late: 0, leave: 1, other: 0, days_recorded: 3, percentage: 33.3 },
    days: [
      {
        date: '2026-03-02', total: 1, present: 1, absent: 0, late: 0, leave: 0, other: 0, status: 'present',
        sessions: [{ id: 1, subject_id: 7, subject: 'Programming', subject_code: 'CS101', status: 'present', marked_by: 'Dr. Rao', remarks: null }],
      },
      {
        date: '2026-03-03', total: 1, present: 0, absent: 1, late: 0, leave: 0, other: 0, status: 'absent',
        sessions: [{ id: 2, subject_id: 7, subject: 'Programming', subject_code: 'CS101', status: 'absent', marked_by: 'Dr. Rao', remarks: null }],
      },
      {
        date: '2026-03-04', total: 1, present: 0, absent: 0, late: 0, leave: 1, other: 0, status: 'leave',
        sessions: [{ id: 3, subject_id: 7, subject: 'Programming', subject_code: 'CS101', status: 'leave', marked_by: null, remarks: 'Medical' }],
      },
    ],
  },
};

beforeEach(() => {
  signInAs();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 2, 10, 10, 0)); // 10 March 2026
});

afterEach(() => {
  vi.useRealTimers();
});

describe('attendance calendar', () => {
  it('lays out a Monday-first month grid', () => {
    const cells = monthGrid('2026-03'); // 1 March 2026 is a Sunday
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-03-01']);
    expect(cells.filter(Boolean)).toHaveLength(31);
    expect(cells.length % 7).toBe(0);
  });

  it('colours each day by status and lists a chosen day’s sessions', async () => {
    const fetchMock = routeFetch({ '/student/attendance/calendar': MARCH });
    const user = userEvent.setup();
    render(<AttendanceCalendar />);

    const absentDay = await screen.findByRole('button', { name: /3 March 2026: Absent, 0 of 1 sessions attended/ });
    expect(screen.getByRole('button', { name: /^Monday, 2 March 2026: Present, 1 of 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /4 March 2026: On leave/ })).toBeInTheDocument();
    expect(screen.getByText('33.3%')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0][0])).toContain('month=2026-03');

    // Today (10 March) has no record.
    expect(screen.getByText('No attendance was recorded on this day.')).toBeInTheDocument();

    await user.click(absentDay);
    expect(absentDay).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Tuesday, 3 March 2026')).toBeInTheDocument();
    expect(within(screen.getByText('Tuesday, 3 March 2026').parentElement as HTMLElement).getByText('Absent')).toBeInTheDocument();
  });

  it('moves between months and cannot go past the current one', async () => {
    const fetchMock = routeFetch({ '/student/attendance/calendar': MARCH });
    const user = userEvent.setup();
    render(<AttendanceCalendar subjectId={7} subjectName="Programming" />);

    await screen.findByRole('button', { name: /^Monday, 2 March 2026/ });
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    expect(String(fetchMock.mock.calls[0][0])).toContain('subject_id=7');

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('month=2026-02');
    expect(screen.getByRole('button', { name: 'This month' })).toBeInTheDocument();
  });
});

describe('student attendance view', () => {
  it('reads the subject summary list and shows the calendar by default', async () => {
    routeFetch({
      '/student/attendance/calendar': MARCH,
      '/student/attendance/detailed': { success: true, data: [] },
      '/student/attendance': {
        success: true,
        data: [{ subject_id: 7, subject: 'Programming', subject_code: 'CS101', total_classes: 3, present: 1, absent: 1, late: 0, percentage: 33.33, status: 'critical' }],
      },
    });
    render(<StudentAttendanceView />);

    expect(await screen.findByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('33.3% Critical')).toBeInTheDocument();
    expect(await screen.findByText('Attendance calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Calendar/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('student timetable view', () => {
  it('shows real sessions from all_slots with their duration and class', async () => {
    routeFetch({
      '/student/timetable': {
        success: true,
        data: {
          class: { id: 1, name: 'CSE-1A', code: 'CSE1A', semester: 'Semester 1' },
          notice: null,
          all_classes: 1,
          learning_hours_per_week: 1.5,
          unique_faculty: 1,
          all_slots: [
            {
              id: 5, course_code: 'CS101', course_name: 'Programming', faculty: 'Dr. Rao', day: 'Tuesday',
              start_time: '02:00 PM', end_time: '03:30 PM', start: '14:00', end: '15:30', duration_minutes: 90,
              session_type: 'lab', room: 'L2', semester: 'Semester 1',
            },
          ],
        },
      },
    });
    render(<StudentTimetableView />); // 10 March 2026 is a Tuesday

    expect(await screen.findByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('CSE-1A · Semester 1')).toBeInTheDocument();
    expect(screen.getByText('2:00 PM - 3:30 PM')).toBeInTheDocument();
    expect(screen.getByText('1 hr 30 min')).toBeInTheDocument();
    expect(screen.getByText('Room L2')).toBeInTheDocument();
    expect(screen.getByText('1.5 hrs')).toBeInTheDocument();
  });

  it('explains a missing class instead of showing an error', async () => {
    const notice = 'You have not been added to a class yet. Your timetable will appear here once your institution assigns you to one.';
    routeFetch({
      '/student/timetable': {
        success: true,
        data: { class: null, notice, all_classes: 0, learning_hours_per_week: 0, unique_faculty: 0, daily_schedule: {}, all_slots: [] },
      },
    });
    render(<StudentTimetableView />);

    const alert = await screen.findByText('No timetable yet');
    expect(within(alert.closest('[role="alert"]') ?? document.body).getByText(notice)).toBeInTheDocument();
    expect(screen.queryByText('Error Loading Timetable')).toBeNull();
  });
});
