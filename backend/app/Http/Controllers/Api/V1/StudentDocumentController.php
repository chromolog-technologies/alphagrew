<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Services\Audit\AuditLogger;
use App\Support\Campus\CampusPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Student documents. Students upload and remove their own (not once verified); staff who can see
 * the student list them; verifying needs students.edit, like education records. Files are private
 * and opened through a five-minute signed URL.
 */
class StudentDocumentController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function mine(Request $request): JsonResponse
    {
        $student = $this->ownStudent($request);

        return response()->json(['data' => $student->hasMany(StudentDocument::class)->latest()->get()->map(fn ($d) => $this->present($d))->all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $student = $this->ownStudent($request);
        $v = $request->validate([
            'type' => ['required', Rule::in(StudentDocument::TYPES)],
            'title' => ['required', 'string', 'max:150'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ]);
        abort_if(StudentDocument::query()->where('student_id', $student->id)->count() >= 30, 422, 'You can keep at most 30 documents. Remove one first.');

        $file = $request->file('file');
        $document = StudentDocument::query()->create([
            'student_id' => $student->id,
            'type' => $v['type'],
            'title' => $v['title'],
            'file_path' => $file->store("student-documents/{$student->id}", StudentDocument::DISK),
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'size_bytes' => $file->getSize(),
            'status' => 'pending',
        ]);
        $this->audit->record('student_document.uploaded', $document, [], $document->only(['student_id', 'type', 'title']));

        return response()->json(['data' => $this->present($document)], 201);
    }

    public function destroy(Request $request, StudentDocument $document): JsonResponse
    {
        $student = $this->ownStudent($request);
        abort_unless($document->student_id === $student->id, 404);
        abort_if($document->status === 'verified', 422, 'A verified document cannot be removed. Ask the office to update it.');

        Storage::disk(StudentDocument::DISK)->delete($document->file_path);
        $document->delete();
        $this->audit->record('student_document.deleted', $document, $document->only(['type', 'title']), []);

        return response()->json(['message' => 'Document removed.']);
    }

    /** Staff: one student's documents. */
    public function forStudent(Request $request, Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return response()->json(['data' => StudentDocument::query()->where('student_id', $student->id)->latest()->get()->map(fn ($d) => $this->present($d))->all()]);
    }

    /** Staff: documents waiting for review across the institution. */
    public function pending(Request $request): JsonResponse
    {
        abort_unless($request->user()->can(CampusPermission::STUDENTS_EDIT), 403, 'You cannot review documents.');

        $documents = StudentDocument::query()->with('student:id,name,registration_number')->where('status', 'pending')->oldest()->limit(200)->get();

        return response()->json(['data' => $documents->map(fn ($d) => [...$this->present($d), 'student' => $d->student?->only(['id', 'name', 'registration_number'])])->all()]);
    }

    public function review(Request $request, StudentDocument $document): JsonResponse
    {
        abort_unless($request->user()->can(CampusPermission::STUDENTS_EDIT), 403, 'You cannot review documents.');
        $v = $request->validate([
            'status' => ['required', Rule::in(['verified', 'rejected'])],
            'remarks' => ['required_if:status,rejected', 'nullable', 'string', 'max:255'],
        ], ['remarks.required_if' => 'Say why the document is rejected, so the student can fix it.']);

        $before = $document->only(['status']);
        $document->update(['status' => $v['status'], 'review_remarks' => $v['remarks'] ?? null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        $this->audit->record('student_document.reviewed', $document, $before, $document->only(['status', 'review_remarks']));

        return response()->json(['data' => $this->present($document)]);
    }

    /** A five-minute link to the file, for the student or staff who can see the student. */
    public function link(Request $request, StudentDocument $document): JsonResponse
    {
        $user = $request->user();
        $own = $document->student?->user_id === $user->id;
        if (! $own) {
            $this->authorize('view', $document->student);
        }

        $expiresAt = now()->addMinutes(5);

        return response()->json(['data' => [
            'url' => URL::temporarySignedRoute('student-documents.file', $expiresAt, ['document' => $document->id]),
            'expiresAt' => $expiresAt->toIso8601String(),
        ]]);
    }

    /** Signed file response (no bearer token), same pattern as resumes. */
    public function file(StudentDocument $document): StreamedResponse
    {
        abort_unless(Storage::disk(StudentDocument::DISK)->exists($document->file_path), 404);

        return Storage::disk(StudentDocument::DISK)->response($document->file_path, $document->original_name);
    }

    private function ownStudent(Request $request): Student
    {
        return Student::query()->where('user_id', $request->user()->id)->firstOr(fn () => abort(403, 'Only students manage their documents here.'));
    }

    /** @return array<string, mixed> */
    private function present(StudentDocument $d): array
    {
        return [
            'id' => $d->id, 'studentId' => $d->student_id, 'type' => $d->type, 'title' => $d->title, 'originalName' => $d->original_name,
            'mimeType' => $d->mime_type, 'sizeBytes' => $d->size_bytes, 'status' => $d->status, 'reviewRemarks' => $d->review_remarks,
            'reviewedAt' => $d->reviewed_at?->toIso8601String(), 'uploadedAt' => $d->created_at?->toIso8601String(),
        ];
    }
}
