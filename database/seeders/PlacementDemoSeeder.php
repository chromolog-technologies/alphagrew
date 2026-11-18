<?php

namespace Database\Seeders;

use App\Enums\ApplicationStatus;
use App\Models\Institution;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\PlacementPolicy;
use App\Models\PlacementResult;
use App\Models\PlacementRound;
use App\Models\Student;
use App\Models\User;
use App\Support\Tenancy\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Placement demo data on the job-posting model, after CampusDemoSeeder imported the demo
 * companies as jobs: deadlines and CGPA rules on the open jobs, the institution's placement
 * policy, and one job (the first open one) with applications at every stage of the pipeline,
 * an aptitude round with results, a pending offer for student@demo.com and one placed student.
 * No notifications are sent.
 */
class PlacementDemoSeeder extends Seeder
{
    public function run(): void
    {
        $institutionId = Institution::query()->where('code', Institution::DEFAULT_CODE)->value('id')
            ?? throw new \RuntimeException('Run CampusDemoSeeder first.');

        DB::transaction(fn () => app(Tenant::class)->runAs($institutionId, function (): void {
            $officerId = User::query()->where('email', 'placement@demo.com')->value('id');

            PlacementPolicy::query()->firstOrCreate([], [...PlacementPolicy::DEFAULTS, 'updated_by' => $officerId]);

            $jobs = JobPosting::query()->with('eligibilityRules')->where('status', 'open')->orderBy('id')->get();

            foreach ($jobs as $index => $job) {
                $job->forceFill([
                    'apply_deadline' => now()->addDays(10 + 3 * $index)->setTime(23, 59),
                    'published_at' => $job->published_at ?? now()->subDays(6 - $index),
                    'created_by' => $job->created_by ?? $officerId,
                    'ctc_min_paise' => $job->ctc_min_paise ?? (400 + 80 * $index) * 100_000,
                    'ctc_max_paise' => $job->ctc_max_paise ?? (600 + 80 * $index) * 100_000,
                ])->save();

                if (! $job->eligibilityRules->contains('field', 'cgpa')) {
                    $job->eligibilityRules()->create(['field' => 'cgpa', 'operator' => 'gte', 'value' => $index === 0 ? 7.0 : 7.5]);
                }

                if (! $job->eligibilityRules->contains('field', 'active_backlogs')) {
                    $job->eligibilityRules()->create(['field' => 'active_backlogs', 'operator' => 'lte', 'value' => 0]);
                }
            }

            if ($pipelineJob = $jobs->first()) {
                $this->pipeline($pipelineJob->fresh('eligibilityRules'), $officerId);
            }
        }));
    }

    /** Applications at every stage for one job, with history, a round and an offer. */
    private function pipeline(JobPosting $job, ?int $officerId): void
    {
        $departments = (array) ($job->eligibilityRules->firstWhere('field', 'department')?->value ?? []);
        $demoStudent = Student::query()->whereHas('user', fn ($query) => $query->where('email', 'student@demo.com'))->first();

        $students = Student::query()
            ->when($departments !== [], fn ($query) => $query->whereIn('department_code', $departments))
            ->where('cgpa', '>=', 7.0)
            ->whereKeyNot($demoStudent?->id ?? 0)
            ->orderByDesc('cgpa')
            ->limit(9)
            ->get();

        // Final status per student, in pipeline order; the demo student holds a pending offer.
        $plan = [
            ApplicationStatus::Placed, ApplicationStatus::Selected, ApplicationStatus::InRounds, ApplicationStatus::InRounds,
            ApplicationStatus::Rejected, ApplicationStatus::Shortlisted, ApplicationStatus::Shortlisted,
            ApplicationStatus::Applied, ApplicationStatus::Applied,
        ];
        $assignments = $students->values()->map(fn (Student $student, int $index) => [$student, $plan[$index] ?? ApplicationStatus::Applied]);

        if ($demoStudent) {
            $assignments->prepend([$demoStudent, ApplicationStatus::Offered]);
        }

        $round = PlacementRound::query()->create([
            'company_id' => $job->company_id, 'job_posting_id' => $job->id, 'sequence' => 1,
            'name' => 'Online aptitude test', 'type' => 'aptitude', 'scheduled_at' => now()->subDays(2)->setTime(10, 0), 'duration_minutes' => 60,
        ]);

        foreach ($assignments as [$student, $final]) {
            $this->application($job, $student, $final, $round, $officerId);
        }
    }

    private function application(JobPosting $job, Student $student, ApplicationStatus $final, PlacementRound $round, ?int $officerId): void
    {
        $path = match ($final) {
            ApplicationStatus::Applied => [ApplicationStatus::Applied],
            ApplicationStatus::Shortlisted => [ApplicationStatus::Applied, ApplicationStatus::Shortlisted],
            ApplicationStatus::InRounds => [ApplicationStatus::Applied, ApplicationStatus::Shortlisted, ApplicationStatus::InRounds],
            ApplicationStatus::Rejected => [ApplicationStatus::Applied, ApplicationStatus::Shortlisted, ApplicationStatus::Rejected],
            ApplicationStatus::Selected => [ApplicationStatus::Applied, ApplicationStatus::Shortlisted, ApplicationStatus::InRounds, ApplicationStatus::Selected],
            ApplicationStatus::Offered => [ApplicationStatus::Applied, ApplicationStatus::Shortlisted, ApplicationStatus::InRounds, ApplicationStatus::Selected, ApplicationStatus::Offered],
            default => [ApplicationStatus::Applied, ApplicationStatus::Shortlisted, ApplicationStatus::InRounds, ApplicationStatus::Selected, ApplicationStatus::Offered, ApplicationStatus::Placed],
        };
        $appliedAt = now()->subDays(5);
        $ctc = $job->ctcLpa();

        $application = JobApplication::query()->updateOrCreate(
            ['job_posting_id' => $job->id, 'student_id' => $student->id],
            [
                'status' => $final,
                'applied_at' => $appliedAt,
                'eligibility_snapshot' => ['evaluatedAt' => $appliedAt->toIso8601String(), 'rules' => []],
                'decided_at' => $final->isFinal() ? now()->subDay() : null,
                'offer_ctc_lpa' => in_array($final, [ApplicationStatus::Offered, ApplicationStatus::Placed], true) ? $ctc : null,
                'offered_at' => in_array($final, [ApplicationStatus::Offered, ApplicationStatus::Placed], true) ? now()->subDay() : null,
                'offer_respond_by' => in_array($final, [ApplicationStatus::Offered, ApplicationStatus::Placed], true) ? now()->addDays(6)->endOfDay() : null,
                'responded_at' => $final === ApplicationStatus::Placed ? now()->subHours(6) : null,
            ],
        );

        $application->events()->delete();
        $previous = null;
        foreach ($path as $step => $status) {
            $application->events()->create([
                'from_status' => $previous?->value,
                'to_status' => $status->value,
                'actor_id' => $status === ApplicationStatus::Applied || $status === ApplicationStatus::Placed ? $student->user_id : $officerId,
                'note' => match ($status) {
                    ApplicationStatus::InRounds => 'Cleared Online aptitude test.',
                    ApplicationStatus::Rejected => 'Did not clear Online aptitude test.',
                    default => null,
                },
            ])->forceFill(['created_at' => $appliedAt->copy()->addDays($step)])->save();
            $previous = $status;
        }

        if (in_array(ApplicationStatus::InRounds, $path, true) || $final === ApplicationStatus::Rejected) {
            PlacementResult::query()->updateOrCreate(
                ['round_id' => $round->id, 'job_application_id' => $application->id],
                [
                    'student_id' => $student->id, 'company_id' => $job->company_id,
                    'status' => $final === ApplicationStatus::Rejected ? 'failed' : 'passed',
                    'score' => $final === ApplicationStatus::Rejected ? 38 : 70 + ($student->id % 25),
                ],
            );
        }

        if ($final === ApplicationStatus::Placed) {
            $student->forceFill(['placed_company' => $job->company?->name, 'status' => 'Placed'])->save();
        }
    }
}
