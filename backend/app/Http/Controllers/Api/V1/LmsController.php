<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\AssignmentSubmission;
use App\Models\CourseMaterial;
use App\Models\Student;
use App\Models\Subject;
use App\Models\SubjectAllocation;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\Academics\StudentSubjects;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Materials and assignments per subject.
 * - Faculty allocated to a subject (and admins) post materials and assignments and grade work.
 * - Students see the subjects they take (StudentSubjects) and submit; they can resubmit until
 *   the work is graded, and after the due time only if the assignment allows late work.
 * Files are private; GET …/link returns a five-minute signed URL.
 */
class LmsController extends Controller
{
    private const DISK = 'local';

    private const FILE_RULE = ['file', 'mimes:pdf,doc,docx,ppt,pptx,xls,xlsx,txt,zip,jpg,jpeg,png', 'max:20480'];

    public function __construct(private readonly AuditLogger $audit) {}

    // ---- Faculty ------------------------------------------------------------------------------

    /** Subjects the user teaches (admins: all). */
    public function teaching(Request $request): JsonResponse
    {
        $user = $request->user();
        $subjects = Subject::query()
            ->unless($user->isAdmin(), fn ($q) => $q->whereIn('id', SubjectAllocation::query()->where('faculty_id', $user->id)->select('subject_id')))
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'semester_number']);

        return response()->json(['data' => $subjects->map(fn (Subject $s) => $s->only(['id', 'code', 'name', 'semester_number']))->all()]);
    }

    public function subjectContent(Request $request, Subject $subject): JsonResponse
    {
        $this->ensureCanRead($request->user(), $subject);
        $student = $this->studentOf($request->user());

        $materials = CourseMaterial::query()->where('subject_id', $subject->id)->latest()->get();
        $assignments = Assignment::query()->where('subject_id', $subject->id)->withCount('submissions')->orderBy('due_at')->get();
        $mine = $student
            ? AssignmentSubmission::query()->where('student_id', $student->id)->whereIn('assignment_id', $assignments->pluck('id'))->get()->keyBy('assignment_id')
            : collect();

        return response()->json(['data' => [
            'subject' => $subject->only(['id', 'code', 'name']),
            'canTeach' => StudentSubjects::teaches($request->user(), $subject),
            'materials' => $materials->map(fn (CourseMaterial $m) => $this->presentMaterial($m))->all(),
            'assignments' => $assignments->map(fn (Assignment $a) => [
                ...$this->presentAssignment($a),
                ...($student ? ['mySubmission' => $mine->has($a->id) ? $this->presentSubmission($mine->get($a->id)) : null] : ['submissions' => $a->submissions_count]),
            ])->all(),
        ]]);
    }

    public function storeMaterial(Request $request, Subject $subject): JsonResponse
    {
        $this->ensureTeaches($request->user(), $subject);
        $v = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'linkUrl' => ['nullable', 'url', 'max:500', 'required_without:file'],
            'file' => ['nullable', 'required_without:linkUrl', ...self::FILE_RULE],
        ]);

        $material = CourseMaterial::query()->create([
            'subject_id' => $subject->id, 'uploaded_by' => $request->user()->id, 'title' => $v['title'],
            'description' => $v['description'] ?? null, 'link_url' => $v['linkUrl'] ?? null,
            ...$this->storeFile($request->file('file'), "lms/materials/{$subject->id}"),
        ]);
        $this->audit->record('course_material.created', $material, [], $material->only(['subject_id', 'title']));

        return response()->json(['data' => $this->presentMaterial($material)], 201);
    }

    public function destroyMaterial(Request $request, CourseMaterial $material): JsonResponse
    {
        $this->ensureTeaches($request->user(), $material->subject);
        if ($material->file_path) {
            Storage::disk(self::DISK)->delete($material->file_path);
        }
        $material->delete();

        return response()->json(['message' => 'Material removed.']);
    }

    public function storeAssignment(Request $request, Subject $subject): JsonResponse
    {
        $this->ensureTeaches($request->user(), $subject);
        $assignment = Assignment::query()->create([...$this->assignmentData($request), 'subject_id' => $subject->id, 'created_by' => $request->user()->id]);
        $this->audit->record('assignment.created', $assignment, [], $assignment->only(['subject_id', 'title', 'due_at']));

        return response()->json(['data' => $this->presentAssignment($assignment)], 201);
    }

    public function updateAssignment(Request $request, Assignment $assignment): JsonResponse
    {
        $this->ensureTeaches($request->user(), $assignment->subject);
        $assignment->update($this->assignmentData($request));

        return response()->json(['data' => $this->presentAssignment($assignment)]);
    }

    public function destroyAssignment(Request $request, Assignment $assignment): JsonResponse
    {
        $this->ensureTeaches($request->user(), $assignment->subject);
        abort_if($assignment->submissions()->exists(), 409, 'Students have submitted work for this assignment, so it cannot be deleted.');
        $assignment->delete();

        return response()->json(['message' => 'Assignment deleted.']);
    }

    public function submissions(Request $request, Assignment $assignment): JsonResponse
    {
        $this->ensureTeaches($request->user(), $assignment->subject);
        $submissions = $assignment->submissions()->with('student:id,name,registration_number')->orderBy('submitted_at')->get();

        return response()->json(['data' => $submissions->map(fn (AssignmentSubmission $s) => [
            ...$this->presentSubmission($s),
            'student' => $s->student?->only(['id', 'name', 'registration_number']),
        ])->all()]);
    }

    public function grade(Request $request, AssignmentSubmission $submission): JsonResponse
    {
        $assignment = $submission->assignment;
        $this->ensureTeaches($request->user(), $assignment->subject);
        $v = $request->validate([
            'marks' => ['required', 'numeric', 'min:0', 'max:'.$assignment->max_marks],
            'feedback' => ['nullable', 'string', 'max:5000'],
        ]);

        $submission->update(['marks' => $v['marks'], 'feedback' => $v['feedback'] ?? null, 'graded_by' => $request->user()->id, 'graded_at' => now()]);
        $this->audit->record('assignment_submission.graded', $submission, [], ['marks' => $v['marks']]);

        return response()->json(['data' => $this->presentSubmission($submission)]);
    }

    // ---- Students -----------------------------------------------------------------------------

    /** The student's subjects with counts of materials and open assignments. */
    public function mySubjects(Request $request): JsonResponse
    {
        $student = $this->studentOf($request->user()) ?? abort(404, 'No student record is linked to your account.');
        $subjects = StudentSubjects::for($student)->orderBy('code')->get(['id', 'code', 'name']);

        $materials = CourseMaterial::query()->whereIn('subject_id', $subjects->pluck('id'))->select('subject_id', DB::raw('COUNT(*) as n'))->groupBy('subject_id')->pluck('n', 'subject_id');
        $open = Assignment::query()->whereIn('subject_id', $subjects->pluck('id'))->where('due_at', '>=', now())->select('subject_id', DB::raw('COUNT(*) as n'))->groupBy('subject_id')->pluck('n', 'subject_id');

        return response()->json(['data' => $subjects->map(fn (Subject $s) => [
            ...$s->only(['id', 'code', 'name']),
            'materials' => (int) ($materials[$s->id] ?? 0),
            'openAssignments' => (int) ($open[$s->id] ?? 0),
        ])->all()]);
    }

    public function submit(Request $request, Assignment $assignment): JsonResponse
    {
        $student = $this->studentOf($request->user()) ?? abort(403, 'Only students submit assignments.');
        abort_unless(StudentSubjects::takes($student, $assignment->subject), 404);
        $late = now()->greaterThan($assignment->due_at);
        abort_if($late && ! $assignment->allow_late, 422, 'The due time has passed and this assignment does not accept late work.');

        $existing = AssignmentSubmission::query()->where('assignment_id', $assignment->id)->where('student_id', $student->id)->first();
        abort_if($existing?->graded_at !== null, 422, 'This work has been graded and can no longer be changed.');

        $v = $request->validate([
            'textAnswer' => ['nullable', 'string', 'max:20000', 'required_without:file'],
            'file' => ['nullable', 'required_without:textAnswer', ...self::FILE_RULE],
        ]);

        if ($existing?->file_path && $request->hasFile('file')) {
            Storage::disk(self::DISK)->delete($existing->file_path);
        }
        $submission = AssignmentSubmission::query()->updateOrCreate(
            ['assignment_id' => $assignment->id, 'student_id' => $student->id],
            [
                'text_answer' => $v['textAnswer'] ?? $existing?->text_answer,
                ...($request->hasFile('file') ? $this->storeFile($request->file('file'), "lms/submissions/{$assignment->id}") : []),
                'submitted_at' => now(),
                'is_late' => $late,
            ],
        );

        return response()->json(['data' => $this->presentSubmission($submission)], $existing ? 200 : 201);
    }

    // ---- Files --------------------------------------------------------------------------------

    public function link(Request $request, string $kind, int $id): JsonResponse
    {
        $user = $request->user();
        [$model] = $this->fileOwner($kind, $id);

        match ($kind) {
            'material' => $this->ensureCanRead($user, $model->subject),
            'submission' => abort_unless(
                $this->studentOf($user)?->id === $model->student_id || StudentSubjects::teaches($user, $model->assignment->subject),
                403,
            ),
        };
        abort_unless($model->file_path, 404, 'There is no file.');

        $expiresAt = now()->addMinutes(5);

        return response()->json(['data' => [
            'url' => URL::temporarySignedRoute('lms.file', $expiresAt, ['kind' => $kind, 'id' => $id]),
            'expiresAt' => $expiresAt->toIso8601String(),
        ]]);
    }

    public function file(string $kind, int $id): StreamedResponse
    {
        [$model] = $this->fileOwner($kind, $id);
        abort_unless($model->file_path && Storage::disk(self::DISK)->exists($model->file_path), 404);

        return Storage::disk(self::DISK)->response($model->file_path, $model->original_name);
    }

    // ---- Helpers ------------------------------------------------------------------------------

    /** @return array{0: CourseMaterial|AssignmentSubmission} */
    private function fileOwner(string $kind, int $id): array
    {
        return [match ($kind) {
            'material' => CourseMaterial::query()->findOrFail($id),
            'submission' => AssignmentSubmission::query()->findOrFail($id),
            default => abort(404),
        }];
    }

    private function ensureTeaches(User $user, Subject $subject): void
    {
        abort_unless(StudentSubjects::teaches($user, $subject), 403, 'You do not teach this subject.');
    }

    private function ensureCanRead(User $user, Subject $subject): void
    {
        $student = $this->studentOf($user);
        $allowed = $student ? StudentSubjects::takes($student, $subject) : StudentSubjects::teaches($user, $subject);
        abort_unless($allowed, 403, 'You cannot see this subject.');
    }

    private function studentOf(User $user): ?Student
    {
        return $user->role === 'student' ? Student::query()->where('user_id', $user->id)->first() : null;
    }

    /** @return array<string, mixed> */
    private function assignmentData(Request $request): array
    {
        $v = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'instructions' => ['nullable', 'string', 'max:10000'],
            'dueAt' => ['required', 'date'],
            'maxMarks' => ['required', 'integer', 'min:1', 'max:1000'],
            'allowLate' => ['sometimes', 'boolean'],
        ]);

        return ['title' => $v['title'], 'instructions' => $v['instructions'] ?? null, 'due_at' => $v['dueAt'], 'max_marks' => $v['maxMarks'], 'allow_late' => $v['allowLate'] ?? false];
    }

    /** @return array<string, mixed> */
    private function storeFile(?UploadedFile $file, string $directory): array
    {
        if (! $file) {
            return [];
        }

        return [
            'file_path' => $file->store($directory, self::DISK),
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'size_bytes' => $file->getSize(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentMaterial(CourseMaterial $m): array
    {
        return [
            'id' => $m->id, 'subjectId' => $m->subject_id, 'title' => $m->title, 'description' => $m->description, 'linkUrl' => $m->link_url,
            'hasFile' => $m->file_path !== null, 'originalName' => $m->original_name, 'createdAt' => $m->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentAssignment(Assignment $a): array
    {
        return [
            'id' => $a->id, 'subjectId' => $a->subject_id, 'title' => $a->title, 'instructions' => $a->instructions,
            'dueAt' => $a->due_at?->toIso8601String(), 'maxMarks' => $a->max_marks, 'allowLate' => $a->allow_late,
            'isOpen' => $a->due_at?->isFuture() ?? false,
        ];
    }

    /** @return array<string, mixed> */
    private function presentSubmission(AssignmentSubmission $s): array
    {
        return [
            'id' => $s->id, 'assignmentId' => $s->assignment_id, 'studentId' => $s->student_id, 'textAnswer' => $s->text_answer,
            'hasFile' => $s->file_path !== null, 'originalName' => $s->original_name, 'submittedAt' => $s->submitted_at?->toIso8601String(),
            'isLate' => $s->is_late, 'marks' => $s->marks, 'feedback' => $s->feedback, 'gradedAt' => $s->graded_at?->toIso8601String(),
        ];
    }
}
