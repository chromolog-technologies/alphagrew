<?php

namespace App\Actions\Placement;

use App\Enums\ApplicationStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\CompanyApplication;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\User;
use App\Services\Placement\PlacementGate;
use Illuminate\Support\Facades\DB;

/**
 * A student applies to a job: the job's rules and the placement policies are checked, and the
 * full result is stored on the application (PRD §10: eligibility is snapshotted at apply time).
 * Applying twice returns the existing application. The legacy `company_applications` row is
 * kept in step so older screens still show "Applied".
 */
class ApplyToJobAction
{
    public function __construct(private readonly PlacementGate $gate)
    {
    }

    public function execute(User $user, JobPosting $job): JobApplication
    {
        $student = $user->student
            ?? throw BusinessRuleException::forbidden('A linked student profile is required before applying.');

        $existing = JobApplication::query()->where('job_posting_id', $job->id)->where('student_id', $student->id)->first();

        if ($existing) {
            if ($existing->status === ApplicationStatus::Withdrawn) {
                throw BusinessRuleException::unprocessable('You withdrew from this job and cannot apply again.');
            }

            return $existing;
        }

        $assessment = $this->gate->assess($student, $job);

        if (! $assessment['canApply']) {
            $failed = collect($assessment['rules'])->reject(fn (array $rule) => $rule['passed'])->values();
            $reasons = [
                ...$failed->map(fn (array $rule) => "{$rule['label']}: needs {$rule['expected']}, you have {$rule['actual']}.")->all(),
                ...array_column($assessment['blockers'], 'message'),
            ];

            throw BusinessRuleException::unprocessable($reasons[0] ?? 'You cannot apply to this job.', [
                'reasons' => $reasons,
                'rules' => $assessment['rules'],
                'blockers' => $assessment['blockers'],
            ]);
        }

        return DB::transaction(function () use ($job, $student, $user, $assessment): JobApplication {
            $application = JobApplication::query()->create([
                'job_posting_id' => $job->id,
                'student_id' => $student->id,
                'resume_id' => $student->resumes()->latest('id')->value('id'),
                'status' => ApplicationStatus::Applied,
                'eligibility_snapshot' => ['evaluatedAt' => now()->toIso8601String(), 'rules' => $assessment['rules']],
                'applied_at' => now(),
            ]);

            $application->events()->create([
                'from_status' => null,
                'to_status' => ApplicationStatus::Applied->value,
                'actor_id' => $user->id,
            ]);

            if ($job->company_id) {
                $legacy = CompanyApplication::query()->firstOrCreate(['student_id' => $student->id, 'company_id' => $job->company_id]);

                if ($legacy->wasRecentlyCreated) {
                    $job->company?->increment('applicants');
                }
            }

            // The student's cached applications are now stale (policy checks read them).
            $student->unsetRelation('jobApplications');

            return $application;
        });
    }
}
