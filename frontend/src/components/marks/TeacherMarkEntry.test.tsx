import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyExam, Roster, RosterEntry } from '../../api/markEntryApi';
import { signInAs } from '../../test/mockFetch';
import { TeacherMarkEntry } from './TeacherMarkEntry';

const exam = (id: number, semester: { id: number; name: string; is_active: boolean }, status: MyExam['status'], date: string): MyExam => ({
  id,
  name: `Exam ${id}`,
  subject_id: 10 + id,
  semester_id: semester.id,
  exam_date: date,
  max_marks: 100,
  status,
  subject: { id: 10 + id, code: `CS${id}`, name: `Subject ${id}` },
  exam_type: null,
  semester,
});

const past = { id: 1, name: 'Odd 2025-26', is_active: false };
const current = { id: 2, name: 'Odd 2026-27', is_active: true };
const exams = [exam(1, past, 'conducted', '2025-11-20'), exam(2, current, 'scheduled', '2026-11-25'), exam(3, current, 'conducted', '2026-09-15')];

const entry = (patch: Partial<RosterEntry>): RosterEntry => ({
  id: 1, internalMarks: null, externalMarks: null, extraMarks: 0, totalMarks: null, grade: null, result: null,
  isAbsent: false, status: 'draft', remarks: null, ...patch,
});

function roster(students: Roster['students']): Roster {
  return {
    exam: { id: 3, name: 'Exam 3', semesterId: 2 },
    subject: { id: 13, code: 'CS3', name: 'Subject 3', credits: 4 },
    markScheme: { id: 1, internalMax: 40, externalMax: 60, totalMax: 100, internalPass: 16, externalPass: 24, totalPass: 40, extraMarksAllowed: 0 },
    students,
  };
}

let currentRoster: Roster;
let fetchMock: ReturnType<typeof vi.fn>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  signInAs();
  currentRoster = roster([
    { id: 1, name: 'Asha', registrationNumber: 'R1', entry: entry({ internalMarks: 30, externalMarks: 45, totalMarks: 75, grade: 'A' }) },
    { id: 2, name: 'Bala', registrationNumber: 'R2', entry: null },
  ]);
  fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('/api/v1/exams')) return json({ data: exams });
    if (url.startsWith('/api/v1/mark-entries/get-students')) return json({ data: currentRoster });
    if (url === '/api/v1/mark-entries/save-draft') return json({ data: { savedCount: 1 }, message: 'Marks saved as draft.' });
    if (url === '/api/v1/mark-entries/submit') return json({ data: { submittedCount: 2 }, message: 'Marks submitted for review.' });
    return json({ message: 'Not found' }, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
});

function renderEntry() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TeacherMarkEntry />
    </QueryClientProvider>,
  );
}

const callsTo = (path: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).startsWith(path)) as unknown as [string, RequestInit][];

describe('TeacherMarkEntry', () => {
  it('lists only my exams and opens the latest conducted exam of the current semester', async () => {
    renderEntry();

    expect(await screen.findByText('Asha')).toBeInTheDocument();
    expect(callsTo('/api/v1/exams')[0][0]).toBe('/api/v1/exams?mine=1');
    expect(screen.getByLabelText('Exam')).toHaveValue('3');
    expect(callsTo('/api/v1/mark-entries/get-students')[0][0]).toBe('/api/v1/mark-entries/get-students?examId=3&subjectId=13');

    const select = screen.getByLabelText('Exam');
    expect(within(select).getByRole('group', { name: 'Odd 2026-27 (current)' })).toBeInTheDocument();
  });

  it('checks marks against the scheme and saves only the rows that changed', async () => {
    renderEntry();
    const user = userEvent.setup();
    await screen.findByText('Bala');

    await user.type(screen.getByLabelText('Internal marks for Bala'), '45');
    expect(screen.getByRole('alert')).toHaveTextContent('Internal is out of 40.');
    expect(screen.getByRole('button', { name: /Save draft/ })).toBeDisabled();

    await user.clear(screen.getByLabelText('Internal marks for Bala'));
    await user.type(screen.getByLabelText('Internal marks for Bala'), '35');
    await user.type(screen.getByLabelText('External marks for Bala'), '50');
    expect(screen.getByText('85 / 100')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save draft/ }));

    expect(await screen.findByText('Saved 1 student as draft.')).toBeInTheDocument();
    const [, init] = callsTo('/api/v1/mark-entries/save-draft')[0];
    expect(JSON.parse(String(init.body))).toEqual({
      examId: 3,
      subjectId: 13,
      entries: [{ studentId: 2, internalMarks: 35, externalMarks: 50, extraMarks: null, isAbsent: false }],
    });
  });

  it('submits only a complete, saved class after the declaration', async () => {
    currentRoster = roster([
      { id: 1, name: 'Asha', registrationNumber: 'R1', entry: entry({ internalMarks: 30, externalMarks: 45 }) },
      { id: 2, name: 'Bala', registrationNumber: 'R2', entry: null },
    ]);
    renderEntry();
    const user = userEvent.setup();
    await screen.findByText('Bala');

    expect(screen.getByText(/1 student has no marks yet/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit for review/ })).toBeDisabled();

    // Bala is absent; after saving, the class is complete.
    await user.click(screen.getByLabelText('Bala was absent'));
    expect(screen.getByText('Save your changes before submitting.')).toBeInTheDocument();
    currentRoster = roster([
      { id: 1, name: 'Asha', registrationNumber: 'R1', entry: entry({ internalMarks: 30, externalMarks: 45 }) },
      { id: 2, name: 'Bala', registrationNumber: 'R2', entry: entry({ id: 2, isAbsent: true, grade: 'Ab' }) },
    ]);
    await user.click(screen.getByRole('button', { name: /Save draft/ }));
    await screen.findByText('Saved 1 student as draft.');

    expect(screen.getByRole('button', { name: /Submit for review/ })).toBeDisabled();
    await user.click(screen.getByLabelText(/I confirm these marks are complete and correct/));
    await user.click(screen.getByRole('button', { name: /Submit for review/ }));

    expect(await screen.findByText(/Submitted 2 entries for review/)).toBeInTheDocument();
    const [, init] = callsTo('/api/v1/mark-entries/submit')[0];
    expect(JSON.parse(String(init.body))).toEqual({ examId: 3, subjectId: 13, declarationConfirmed: true });
  });

  it('keeps submitted marks read-only', async () => {
    currentRoster = roster([
      { id: 1, name: 'Asha', registrationNumber: 'R1', entry: entry({ internalMarks: 30, externalMarks: 45, status: 'submitted' }) },
    ]);
    renderEntry();

    expect(await screen.findByText(/All marks for this exam have been submitted/)).toBeInTheDocument();
    expect(screen.getByLabelText('Internal marks for Asha')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save draft/ })).not.toBeInTheDocument();
  });

  it('explains when a teacher has no exams', async () => {
    fetchMock.mockImplementation(async () => json({ data: [] }));
    renderEntry();

    expect(await screen.findByText(/No exams to enter marks for/)).toBeInTheDocument();
  });
});
