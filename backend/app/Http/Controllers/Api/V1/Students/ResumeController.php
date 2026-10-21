<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Actions\Resumes\DeleteResumeAction;
use App\Actions\Resumes\UploadResumeAction;
use App\Enums\ResumeStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\StoreResumeRequest;
use App\Http\Resources\ResumeAnalysisResource;
use App\Http\Resources\ResumeDetailResource;
use App\Http\Resources\ResumeResource;
use App\Jobs\AnalyzeResumeJob;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * AI Interview Journey phase A — the student's uploaded resumes, parsing and ATS analysis
 * (spec §3). Parsing and analysis run as queued jobs after upload.
 */
class ResumeController extends Controller
{
    /** GET /students/me/resumes — newest first. */
    public function index(OwnStudentRequest $request): JsonResponse
    {
        $resumes = $request->student()->resumes()->with('analysis')->latest('id')->get();

        return response()->json(['data' => ResumeResource::collection($resumes)]);
    }

    /** POST /students/me/resumes — 201 with status "parsing"; ParseResumeJob takes over. */
    public function store(StoreResumeRequest $request, UploadResumeAction $upload): JsonResponse
    {
        $resume = $upload->execute($request->student(), $request->file('file'), $request->validated('title'));

        return response()->json(['data' => new ResumeResource($resume->setRelation('analysis', null))], 201);
    }

    /** GET /students/me/resumes/{resume} — including the parsed sections. */
    public function show(OwnStudentRequest $request, Resume $resume): JsonResponse
    {
        $request->ownRecord('resume');

        return response()->json(['data' => new ResumeDetailResource($resume->load('analysis'))]);
    }

    /** GET /students/me/resumes/{resume}/analysis — 404 until the analysis is ready. */
    public function analysis(OwnStudentRequest $request, Resume $resume): JsonResponse
    {
        $request->ownRecord('resume');
        $analysis = $resume->analysis ?? abort(404, 'This resume has not been analysed yet.');

        return response()->json(['data' => new ResumeAnalysisResource($analysis)]);
    }

    /** GET /students/me/resumes/{resume}/download — signed URL, five minutes. */
    public function download(OwnStudentRequest $request, Resume $resume): JsonResponse
    {
        $request->ownRecord('resume');
        $this->storedFile($resume);

        $expiresAt = now()->addMinutes(5);

        return response()->json(['data' => [
            'url' => URL::temporarySignedRoute('resumes.download', $expiresAt, ['resume' => $resume->id]),
            'expiresAt' => $expiresAt->toIso8601String(),
        ]]);
    }

    /** Signed file response. No bearer token, same pattern as student photos. */
    public function file(Resume $resume): StreamedResponse
    {
        return Storage::disk(config('ai.resumes.disk'))->response($this->storedFile($resume));
    }

    /** POST /students/me/resumes/{resume}/analysis — queue another analysis after parsing. */
    public function queueAnalysis(OwnStudentRequest $request, Resume $resume): JsonResponse
    {
        $request->ownRecord('resume');
        abort_unless($resume->status === ResumeStatus::Parsed, 422, 'The resume has not been parsed yet.');

        AnalyzeResumeJob::dispatch($resume->institution_id, $resume->id);

        return response()->json(['data' => ['status' => 'queued']], 202);
    }

    private function storedFile(Resume $resume): string
    {
        $path = $resume->file_path;
        abort_unless(is_string($path) && $path !== '' && Storage::disk(config('ai.resumes.disk'))->exists($path), 404);

        return $path;
    }

    /** DELETE /students/me/resumes/{resume} */
    public function destroy(OwnStudentRequest $request, Resume $resume, DeleteResumeAction $delete): JsonResponse
    {
        $request->ownRecord('resume');
        $delete->execute($resume);

        return response()->json(['message' => 'Resume deleted']);
    }
}
