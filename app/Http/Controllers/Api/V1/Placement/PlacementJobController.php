<?php

namespace App\Http\Controllers\Api\V1\Placement;

use App\Actions\Placement\JobPostingActions;
use App\Actions\Placement\OfferActions;
use App\Actions\Placement\RoundActions;
use App\Actions\Placement\TransitionApplicationAction;
use App\Enums\ApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Placement\EligibilityPreviewRequest;
use App\Http\Requests\Placement\SaveJobPostingRequest;
use App\Http\Resources\JobApplicationResource;
use App\Http\Resources\JobPostingResource;
use App\Models\Company;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\PlacementRound;
use App\Models\Student;
use App\Services\Audit\AuditLogger;
use App\Services\Placement\EligibilityEvaluator;
use App\Services\Placement\PlacementGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * The placement officer's workflow on jobs: create and publish jobs with eligibility rules,
 * see who is eligible, move applications through the pipeline, run rounds, make offers, and
 * debar students. Every change is audit-logged.
 */
class PlacementJobController extends Controller
{
    public function __construct(
        private readonly JobPostingActions $jobs,
        private readonly PlacementGate $gate,
        private readonly AuditLogger $audit,
    ) {
    }

    /** GET /placement/jobs?status= */
    public function index(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => ['nullable', Rule::in(JobPosting::STATUSES)]])['status'] ?? null;

        $jobs = JobPosting::query()
            ->with(['company', 'drive', 'eligibilityRules'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderByRaw("case status when 'open' then 0 when 'draft' then 1 else 2 end")
            ->latest('updated_at')
            ->get();

        $counts = JobApplication::query()
            ->whereIn('job_posting_id', $jobs->modelKeys())
            ->selectRaw('job_posting_id, status, count(*) as total')
            ->groupBy('job_posting_id', 'status')
            ->toBase()
            ->get()
            ->groupBy('job_posting_id');

        return response()->json([
            'data' => $jobs->map(function (JobPosting $job) use ($counts) {
                $resource = new JobPostingResource($job);
                $resource->counts = $this->countsFor($counts->get($job->id, collect()));

                return $resource;
            })->values(),
            'companies' => Company::query()->orderBy('name')->get(['id', 'name', 'industry', 'website']),
        ]);
    }

    public function show(JobPosting $job): JsonResponse
    {
        return response()->json(['data' => $this->present($job)]);
    }

    public function store(SaveJobPostingRequest $request): JsonResponse
    {
        $job = $this->jobs->save($request->user(), null, $request->jobData());
        $this->audit->record('placement.job_created', $job, [], $job->only(['title', 'company_id', 'status']));

        return response()->json(['data' => $this->present($job)], 201);
    }

    public function update(SaveJobPostingRequest $request, JobPosting $job): JsonResponse
    {
        $before = $job->only(['title', 'company_id', 'apply_deadline', 'ctc_min_paise', 'ctc_max_paise']);
        $job = $this->jobs->save($request->user(), $job, $request->jobData());
        $this->audit->record('placement.job_updated', $job, $before, $job->only(array_keys($before)));

        return response()->json(['data' => $this->present($job)]);
    }

    public function destroy(JobPosting $job): JsonResponse
    {
        $this->jobs->delete($job);
        $this->audit->record('placement.job_deleted', $job, $job->only(['title', 'company_id']), []);

        return response()->json(['message' => 'Job deleted.']);
    }

    public function publish(JobPosting $job): JsonResponse
    {
        $notified = $this->jobs->publish($job);
        $this->audit->record('placement.job_published', $job, [], ['notified' => $notified]);

        return response()->json(['data' => $this->present($job->fresh()), 'notified' => $notified]);
    }

    public function close(JobPosting $job): JsonResponse
    {
        $this->jobs->close($job);
        $this->audit->record('placement.job_closed', $job);

        return response()->json(['data' => $this->present($job->fresh())]);
    }

    /** GET /placement/jobs/{job}/eligible-students?filter=eligible|ineligible|all */
    public function eligibleStudents(Request $request, JobPosting $job): JsonResponse
    {
        $filter = $request->validate(['filter' => ['nullable', Rule::in(['eligible', 'ineligible', 'all'])]])['filter'] ?? 'all';
        $students = Student::query()->orderBy('department_code')->orderBy('name')->get();
        $assessments = $this->gate->assessMany($students, $job);
        $applied = JobApplication::query()->where('job_posting_id', $job->id)->pluck('status', 'student_id');

        $rows = $students->map(fn (Student $student) => [
            'id' => $student->id,
            'name' => $student->name,
            'registrationNumber' => $student->registration_number,
            'departmentCode' => $student->department_code,
            'year' => $student->year,
            'cgpa' => $student->academicSummary?->cgpa ?? $student->cgpa,
            'eligible' => $assessments[$student->id]['eligible'],
            'canApply' => $assessments[$student->id]['canApply'],
            'failedRules' => collect($assessments[$student->id]['rules'])->reject(fn ($rule) => $rule['passed'])->values(),
            'blockers' => $assessments[$student->id]['blockers'],
            'applicationStatus' => $applied[$student->id] ?? null,
        ])->filter(fn (array $row) => $filter === 'all' || ($filter === 'eligible') === $row['eligible'])->values();

        return response()->json([
            'data' => $rows,
            'summary' => [
                'total' => $students->count(),
                'eligible' => $assessments->where('eligible', true)->count(),
                'applied' => $applied->count(),
            ],
        ]);
    }

    /** POST /placement/eligibility/preview — counts for unsaved rules in the job editor. */
    public function preview(EligibilityPreviewRequest $request, EligibilityEvaluator $evaluator): JsonResponse
    {
        $rules = $request->rulesToPreview();
        $students = Student::query()->get();
        $evaluator->preload($students, $rules);

        $failures = [];
        $eligible = 0;

        foreach ($students as $student) {
            $result = $evaluator->evaluate($student, $rules);
            $eligible += $result['eligible'] ? 1 : 0;

            foreach ($result['rules'] as $index => $rule) {
                $failures[$index] = ($failures[$index] ?? 0) + ($rule['passed'] ? 0 : 1);
            }
        }

        return response()->json(['data' => [
            'total' => $students->count(),
            'eligible' => $eligible,
            // How many students each rule excludes on its own.
            'excludedByRule' => array_map(fn (int $index) => $failures[$index] ?? 0, array_keys($rules)),
        ]]);
    }

    /** GET /placement/jobs/{job}/applications?status= */
    public function applications(Request $request, JobPosting $job): JsonResponse
    {
        $status = $request->validate(['status' => ['nullable', Rule::in(ApplicationStatus::values())]])['status'] ?? null;

        $applications = $job->applications()
            ->with(['student.academicSummary', 'events.actor:id,name', 'roundResults.round'])
            ->when($status, fn ($query) => $query->where('status', $status))
            ->orderBy('applied_at')
            ->get();

        return response()->json(['data' => JobApplicationResource::collection($applications)]);
    }

    /** POST /placement/applications/status — move several applications to one status. */
    public function updateStatus(Request $request, TransitionApplicationAction $transition): JsonResponse
    {
        $validated = $request->validate([
            'applicationIds' => ['required', 'array', 'min:1', 'max:500'],
            'applicationIds.*' => ['integer', 'distinct'],
            // Offers have their own actions; withdrawing is the student's decision.
            'status' => ['required', Rule::in([
                ApplicationStatus::Shortlisted->value, ApplicationStatus::InRounds->value,
                ApplicationStatus::Selected->value, ApplicationStatus::Rejected->value,
            ])],
            'note' => ['nullable', 'string', 'max:500'],
        ], ['status.in' => 'Choose shortlisted, in rounds, selected or not selected. Use the offer action for offers.']);

        $applications = JobApplication::query()->whereIn('id', $validated['applicationIds'])->get();
        abort_if($applications->count() !== count($validated['applicationIds']), 404, 'Some applications were not found.');
        $to = ApplicationStatus::from($validated['status']);

        DB::transaction(fn () => $applications->each(
            fn (JobApplication $application) => $transition->execute($application, $to, $request->user(), $validated['note'] ?? null),
        ));
        $this->audit->record('placement.applications_status', null, [], ['ids' => $validated['applicationIds'], 'status' => $to->value]);

        return response()->json(['data' => JobApplicationResource::collection($applications->each->load(['student.academicSummary', 'events.actor:id,name']))]);
    }

    public function offer(Request $request, JobApplication $application, OfferActions $offers): JsonResponse
    {
        $validated = $request->validate([
            'ctcLpa' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'respondBy' => ['nullable', 'date', 'after:now'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $offers->issue(
            $request->user(),
            $application->load('jobPosting'),
            isset($validated['ctcLpa']) ? (float) $validated['ctcLpa'] : null,
            isset($validated['respondBy']) ? Carbon::parse($validated['respondBy'])->endOfDay() : null,
            $validated['note'] ?? null,
        );
        $this->audit->record('placement.offer_issued', $application, [], $application->only(['offer_ctc_lpa', 'offer_respond_by']));

        return response()->json(['data' => new JobApplicationResource($application->fresh(['student.academicSummary', 'events.actor:id,name']))]);
    }

    public function rounds(JobPosting $job): JsonResponse
    {
        return response()->json(['data' => $job->rounds()->with('results')->get()->map(fn (PlacementRound $round) => $this->presentRound($round))]);
    }

    public function storeRound(Request $request, JobPosting $job, RoundActions $rounds): JsonResponse
    {
        $round = $rounds->schedule($job, $this->roundData($request));
        $this->audit->record('placement.round_scheduled', $round);

        return response()->json(['data' => $this->presentRound($round->load('results'))], 201);
    }

    public function updateRound(Request $request, PlacementRound $round): JsonResponse
    {
        $data = $this->roundData($request);
        $round->update([
            'name' => $data['name'], 'type' => $data['type'], 'scheduled_at' => $data['scheduledAt'] ?? null,
            'duration_minutes' => $data['durationMinutes'] ?? null, 'description' => $data['description'] ?? null,
        ]);

        return response()->json(['data' => $this->presentRound($round->load('results'))]);
    }

    public function destroyRound(PlacementRound $round): JsonResponse
    {
        abort_if($round->results()->exists(), 409, 'Results are recorded for this round, so it cannot be deleted.');
        $round->delete();

        return response()->json(['message' => 'Round deleted.']);
    }

    /** PUT /placement/rounds/{round}/results */
    public function recordResults(Request $request, PlacementRound $round, RoundActions $rounds): JsonResponse
    {
        $validated = $request->validate([
            'results' => ['required', 'array', 'min:1', 'max:500'],
            'results.*.applicationId' => ['required', 'integer', 'distinct'],
            'results.*.status' => ['required', Rule::in(['passed', 'failed', 'absent'])],
            'results.*.score' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'results.*.feedback' => ['nullable', 'string', 'max:1000'],
        ]);

        $recorded = $rounds->recordResults($request->user(), $round, $validated['results']);
        $this->audit->record('placement.round_results', $round, [], ['recorded' => $recorded]);

        return response()->json(['data' => $this->presentRound($round->fresh('results'))]);
    }

    /** POST /placement/students/{student}/debar */
    public function debar(Request $request, Student $student): JsonResponse
    {
        $validated = $request->validate([
            'until' => ['required', 'date', 'after_or_equal:today'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $student->forceFill(['debarred_until' => $validated['until'], 'debar_reason' => $validated['reason']])->save();
        $this->audit->record('placement.student_debarred', $student, [], $validated);

        return response()->json(['data' => ['debarredUntil' => $student->debarred_until->toDateString(), 'reason' => $student->debar_reason]]);
    }

    public function lift(Student $student): JsonResponse
    {
        $before = ['until' => $student->debarred_until?->toDateString(), 'reason' => $student->debar_reason];
        $student->forceFill(['debarred_until' => null, 'debar_reason' => null])->save();
        $this->audit->record('placement.debarment_lifted', $student, $before, []);

        return response()->json(['data' => ['debarredUntil' => null, 'reason' => null]]);
    }

    private function present(JobPosting $job): JobPostingResource
    {
        $job->loadMissing(['company', 'drive', 'eligibilityRules']);
        $resource = new JobPostingResource($job);
        $resource->counts = $this->countsFor(
            JobApplication::query()->where('job_posting_id', $job->id)->selectRaw('status, count(*) as total')->groupBy('status')->toBase()->get(),
        );

        return $resource;
    }

    /** @return array<string, int> */
    private function countsFor($rows): array
    {
        $counts = array_fill_keys(ApplicationStatus::values(), 0);

        foreach ($rows as $row) {
            $counts[$row->status] = (int) $row->total;
        }

        return ['total' => array_sum($counts), ...$counts];
    }

    /** @return array<string, mixed> */
    private function roundData(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(PlacementRound::TYPES)],
            'scheduledAt' => ['nullable', 'date'],
            'durationMinutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);
    }

    /** @return array<string, mixed> */
    private function presentRound(PlacementRound $round): array
    {
        return [
            'id' => $round->id,
            'jobId' => $round->job_posting_id,
            'sequence' => $round->sequence,
            'name' => $round->name,
            'type' => $round->type,
            'scheduledAt' => $round->scheduled_at?->toIso8601String(),
            'durationMinutes' => $round->duration_minutes,
            'description' => $round->description,
            'results' => $round->results->map(fn ($result) => [
                'applicationId' => $result->job_application_id,
                'studentId' => $result->student_id,
                'status' => $result->status,
                'score' => $result->score,
                'feedback' => $result->feedback,
            ])->values(),
        ];
    }
}
