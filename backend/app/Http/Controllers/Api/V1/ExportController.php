<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\MarkStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\MarkEntry;
use App\Models\User;
use App\Repositories\StudentRepository;
use App\Services\Audit\AuditLogger;
use App\Support\Campus\CampusPermission;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * CSV downloads of what the user can already see on screen:
 * - students:   the students visible to the user (StudentRepository::visibleTo), students.view
 * - staff:      staff and placement officers, departments.view
 * - attendance: records in a date range (faculty who mark only their own: their own), attendance.view
 * - results:    published (locked) marks, optionally for one subject or semester, marks.view
 * Every export is audited.
 */
class ExportController extends Controller
{
    public function __construct(
        private readonly StudentRepository $students,
        private readonly AuditLogger $audit,
    ) {}

    public function show(Request $request, string $type): StreamedResponse
    {
        $user = $request->user();

        [$header, $rows] = match ($type) {
            'students' => $this->students($user),
            'staff' => $this->staff($user),
            'attendance' => $this->attendance($request, $user),
            'results' => $this->results($request, $user),
            default => abort(404),
        };

        $this->audit->record('export.downloaded', null, [], ['type' => $type, 'filters' => $request->query()]);

        return response()->streamDownload(function () use ($header, $rows): void {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // Excel reads UTF-8 with a BOM.
            fputcsv($out, $header);
            foreach ($rows as $row) {
                fputcsv($out, $row);
            }
            fclose($out);
        }, sprintf('%s-%s.csv', $type, now()->format('Y-m-d')), ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{0: list<string>, 1: iterable<list<mixed>>} */
    private function students(User $user): array
    {
        abort_unless($user->can(CampusPermission::STUDENTS_VIEW), 403, 'You cannot export students.');

        $rows = $this->students->visibleTo($user)->lazy(500)->map(fn ($s) => [
            $s->registration_number, $s->name, $s->email, $s->department_code, $s->year, $s->gender, $s->status,
            $s->academicSummary?->cgpa ?? $s->cgpa, $s->academicSummary?->attendance_percentage ?? $s->attendance, $s->fee_status, $s->placed_company,
        ]);

        return [['registration_number', 'name', 'email', 'department', 'year', 'gender', 'status', 'cgpa', 'attendance_pct', 'fee_status', 'placed_company'], $rows];
    }

    /** @return array{0: list<string>, 1: iterable<list<mixed>>} */
    private function staff(User $user): array
    {
        abort_unless($user->can(CampusPermission::DEPARTMENTS_VIEW), 403, 'You cannot export staff.');

        $rows = User::query()->with('designation:id,name')
            ->whereIn('role', [UserRole::Staff->value, UserRole::PlacementOfficer->value])
            ->orderBy('name')->lazy(500)
            ->map(fn (User $u) => [$u->name, $u->email, $u->role, $u->department_code, $u->designation?->name, $u->phone]);

        return [['name', 'email', 'role', 'department', 'designation', 'phone'], $rows];
    }

    /** @return array{0: list<string>, 1: iterable<list<mixed>>} */
    private function attendance(Request $request, User $user): array
    {
        abort_unless($user->can(CampusPermission::ATTENDANCE_VIEW) && $user->roleEnum() !== UserRole::Student, 403, 'You cannot export attendance.');
        $v = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'subjectId' => ['nullable', 'integer'],
        ]);

        $rows = Attendance::query()->with(['student:id,name,registration_number', 'subject:id,code,name'])
            ->whereDate('attendance_date', '>=', $v['from'])->whereDate('attendance_date', '<=', $v['to'])
            ->when($v['subjectId'] ?? null, fn ($q, $id) => $q->where('subject_id', $id))
            // Same rule as the attendance list: staff without attendance.approve export only what they marked.
            ->when($user->roleEnum() === UserRole::Staff && ! $user->hasPermissionTo(CampusPermission::ATTENDANCE_APPROVE, 'sanctum'), fn ($q) => $q->where('faculty_id', $user->id))
            ->orderBy('attendance_date')->lazy(1000)
            ->map(fn (Attendance $a) => [
                substr((string) $a->attendance_date, 0, 10), $a->student?->registration_number, $a->student?->name,
                $a->subject?->code, $a->status, $a->is_approved ? 'yes' : 'no', $a->remarks,
            ]);

        return [['date', 'registration_number', 'student', 'subject', 'status', 'approved', 'remarks'], $rows];
    }

    /** @return array{0: list<string>, 1: iterable<list<mixed>>} */
    private function results(Request $request, User $user): array
    {
        abort_unless($user->can(CampusPermission::MARKS_VIEW) && $user->roleEnum() !== UserRole::Student, 403, 'You cannot export results.');
        $v = $request->validate(['subjectId' => ['nullable', 'integer'], 'semesterId' => ['nullable', 'integer']]);

        $rows = MarkEntry::query()->with(['student:id,name,registration_number', 'subject:id,code,name', 'exam:id,name,semester_id'])
            ->where('status', MarkStatus::Locked->value)
            ->when($v['subjectId'] ?? null, fn ($q, $id) => $q->where('subject_id', $id))
            ->when($v['semesterId'] ?? null, fn ($q, $id) => $q->whereHas('exam', fn ($e) => $e->where('semester_id', $id)))
            ->orderBy('subject_id')->lazy(1000)
            ->map(fn (MarkEntry $m) => [
                $m->subject?->code, $m->exam?->name, $m->student?->registration_number, $m->student?->name,
                $m->internal_marks, $m->external_marks, $m->total_marks, $m->grade, $m->result, $m->is_absent ? 'yes' : 'no',
            ]);

        return [['subject', 'exam', 'registration_number', 'student', 'internal', 'external', 'total', 'grade', 'result', 'absent'], $rows];
    }
}
