<?php

namespace App\Http\Controllers\Api\V1\Placement;

use App\Actions\Placement\ApplyToJobAction;
use App\Actions\Placement\OfferActions;
use App\Actions\Placement\TransitionApplicationAction;
use App\Enums\ApplicationStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Resources\JobApplicationResource;
use App\Http\Resources\JobPostingResource;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\Student;
use App\Services\Audit\AuditLogger;
use App\Services\Placement\PlacementGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The student's side of placements: open jobs with their eligibility, applying, withdrawing,
 * their applications with history, offer responses and the season opt-out.
 */
class StudentJobController extends Controller
{
    public function __construct(private readonly PlacementGate $gate, private readonly AuditLogger $audit)
    {
    }

    /** GET /students/me/jobs — published jobs (and closed ones the student applied to). */
    public function index(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $applications = JobApplication::query()->with('events')->where('student_id', $student->id)->get()->keyBy('job_posting_id');

        $jobs = JobPosting::query()
            ->with(['company', 'drive', 'eligibilityRules'])
            ->where(fn ($query) => $query->where('status', 'open')->orWhereIn('id', $applications->keys()))
            ->orderByRaw('case when status = ? then 0 else 1 end', ['open'])
            ->orderBy('apply_deadline')
            ->get();

        return response()->json([
            'data' => $jobs->map(fn (JobPosting $job) => $this->present($student, $job, $applications->get($job->id)))->values(),
            'placement' => $this->placementState($student),
        ]);
    }

    public function show(Request $request, JobPosting $job): JsonResponse
    {
        $student = $this->student($request);
        $application = JobApplication::query()->with('events')->where('student_id', $student->id)->where('job_posting_id', $job->id)->first();
        abort_if($job->status === 'draft' && ! $application, 404);

        return response()->json(['data' => $this->present($student, $job->load(['company', 'drive', 'eligibilityRules']), $application)]);
    }

    public function apply(Request $request, JobPosting $job, ApplyToJobAction $apply): JsonResponse
    {
        $application = $apply->execute($request->user(), $job);
        $status = $application->wasRecentlyCreated ? 201 : 200;

        return response()->json(['data' => new JobApplicationResource($application->load('events', 'jobPosting.company'))], $status);
    }

    /** GET /students/me/applications */
    public function applications(Request $request): JsonResponse
    {
        $student = $this->student($request);

        $applications = JobApplication::query()
            ->with(['jobPosting.company', 'events', 'roundResults.round'])
            ->where('student_id', $student->id)
            ->latest('applied_at')
            ->get();

        return response()->json(['data' => JobApplicationResource::collection($applications)]);
    }

    public function withdraw(Request $request, JobApplication $application, TransitionApplicationAction $transition): JsonResponse
    {
        $this->own($request, $application);
        $note = $request->validate(['reason' => ['nullable', 'string', 'max:500']])['reason'] ?? null;

        if ($application->status === ApplicationStatus::Offered) {
            throw BusinessRuleException::unprocessable('You have an offer on this application. Decline the offer instead.');
        }

        $transition->execute($application, ApplicationStatus::Withdrawn, $request->user(), $note);

        return response()->json(['data' => new JobApplicationResource($application->fresh(['jobPosting.company', 'events']))]);
    }

    public function acceptOffer(Request $request, JobApplication $application, OfferActions $offers): JsonResponse
    {
        $offers->respond($request->user(), $application->load('jobPosting.company'), true);

        return response()->json(['data' => new JobApplicationResource($application->fresh(['jobPosting.company', 'events']))]);
    }

    public function declineOffer(Request $request, JobApplication $application, OfferActions $offers): JsonResponse
    {
        $offers->respond($request->user(), $application->load('jobPosting.company'), false);

        return response()->json(['data' => new JobApplicationResource($application->fresh(['jobPosting.company', 'events']))]);
    }

    /** PUT /students/me/placement-preference — opt out of (or back into) this season's placements. */
    public function updatePreference(Request $request): JsonResponse
    {
        $student = $this->student($request);
        $optedOut = $request->validate(['optedOut' => ['required', 'boolean']])['optedOut'];

        $student->forceFill(['placement_opted_out_at' => $optedOut ? ($student->placement_opted_out_at ?? now()) : null])->save();
        $this->audit->record($optedOut ? 'placement.opted_out' : 'placement.opted_in', $student);

        return response()->json(['data' => $this->placementState($student)]);
    }

    private function present(Student $student, JobPosting $job, ?JobApplication $application): JobPostingResource
    {
        $resource = new JobPostingResource($job);
        $resource->assessment = $this->gate->assess($student, $job);
        $resource->application = $application ? new JobApplicationResource($application) : null;

        return $resource;
    }

    /** @return array<string, mixed> */
    private function placementState(Student $student): array
    {
        $placed = JobApplication::query()->with('jobPosting.company')->where('student_id', $student->id)
            ->where('status', ApplicationStatus::Placed->value)->latest('responded_at')->first();
        $policy = $this->gate->policy();

        return [
            'optedOut' => $student->placement_opted_out_at !== null,
            'debarredUntil' => $student->isDebarred() ? $student->debarred_until?->toDateString() : null,
            'debarReason' => $student->isDebarred() ? $student->debar_reason : null,
            'placedAt' => $placed?->jobPosting?->company?->name,
            'policy' => [
                'oneOfferRule' => $policy->one_offer_rule,
                'dreamOfferEnabled' => $policy->dream_offer_enabled,
                'dreamOfferMinCtc' => $policy->dream_offer_min_ctc !== null ? (float) $policy->dream_offer_min_ctc : null,
                'maxActiveApplications' => $policy->max_active_applications,
                'minProfileCompletion' => $policy->min_profile_completion,
                'offerResponseDays' => $policy->offer_response_days,
            ],
        ];
    }

    private function student(Request $request): Student
    {
        return $request->user()->student
            ?? throw BusinessRuleException::forbidden('A linked student profile is required for placements.');
    }

    private function own(Request $request, JobApplication $application): void
    {
        abort_unless($application->student_id === $this->student($request)->id, 404);
    }
}
