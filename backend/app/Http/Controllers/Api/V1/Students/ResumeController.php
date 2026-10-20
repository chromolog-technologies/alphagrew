<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Actions\Resumes\DeleteResumeAction;
use App\Actions\Resumes\UploadResumeAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\StoreResumeRequest;
use App\Http\Resources\ResumeAnalysisResource;
use App\Http\Resources\ResumeDetailResource;
use App\Http\Resources\ResumeResource;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;

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

    /** DELETE /students/me/resumes/{resume} */
    public function destroy(OwnStudentRequest $request, Resume $resume, DeleteResumeAction $delete): JsonResponse
    {
        $request->ownRecord('resume');
        $delete->execute($resume);

        return response()->json(['message' => 'Resume deleted']);
    }
}
