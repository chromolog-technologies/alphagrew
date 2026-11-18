<?php

namespace App\Services\Placement;

use App\Enums\ApplicationStatus;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\PlacementPolicy;
use App\Models\Student;
use App\Services\Students\ProfileCompleteness;
use Illuminate\Support\Collection;

/**
 * Everything besides the job's own rules that decides whether a student may apply now
 * (PRD v1.1 §6 placement policies): the job is open, the email is verified, the student has
 * not opted out and is not debarred, the one-offer / dream-offer rule, the active-application
 * cap and the profile-completion minimum.
 *
 * Dream offer: with the one-offer rule on, a placed student may still apply to **one** job
 * whose CTC is at least `dream_offer_min_ctc` (LPA) when dream offers are enabled.
 */
class PlacementGate
{
    private const APPLICATION_RELATIONS = [
        'user:id,email_verified_at',
        'jobApplications.jobPosting:id,company_id,title,ctc_min_paise,ctc_max_paise',
        'jobApplications.jobPosting.company:id,name',
    ];

    private ?PlacementPolicy $policy = null;

    public function __construct(
        private readonly EligibilityEvaluator $eligibility,
        private readonly ProfileCompleteness $completeness,
    ) {
    }

    /**
     * Eligibility plus process checks for one student and job.
     *
     * @return array{eligible: bool, canApply: bool, rules: list<array<string, mixed>>, blockers: list<array{code: string, message: string}>}
     */
    public function assess(Student $student, JobPosting $job): array
    {
        $job->loadMissing('eligibilityRules');
        $eligibility = $this->eligibility->evaluate($student, $job->eligibilityRules);
        $blockers = $this->blockers($student, $job);

        return [
            'eligible' => $eligibility['eligible'],
            'canApply' => $eligibility['eligible'] && $blockers === [],
            'rules' => $eligibility['rules'],
            'blockers' => $blockers,
        ];
    }

    /**
     * Assesses many students for one job with a handful of queries (eligible lists, publishing).
     *
     * @param  Collection<int, Student>  $students
     * @return Collection<int, array<string, mixed>> keyed by student id
     */
    public function assessMany(Collection $students, JobPosting $job): Collection
    {
        $job->loadMissing('eligibilityRules');
        $students->loadMissing(self::APPLICATION_RELATIONS);
        $this->eligibility->preload($students, $job->eligibilityRules);

        return $students->mapWithKeys(fn (Student $student) => [$student->id => $this->assess($student, $job)]);
    }

    /** @return list<array{code: string, message: string}> */
    public function blockers(Student $student, JobPosting $job): array
    {
        $policy = $this->policy();
        $blockers = [];
        $add = function (string $code, string $message) use (&$blockers): void {
            $blockers[] = compact('code', 'message');
        };

        if ($job->status !== 'open') {
            $add('job_closed', $job->status === 'draft' ? 'This job is not published yet.' : 'Applications for this job are closed.');
        } elseif ($job->apply_deadline !== null && $job->apply_deadline->isPast()) {
            $add('deadline_passed', 'The application deadline was '.$job->apply_deadline->format('j M Y, H:i').'.');
        }

        $student->loadMissing(self::APPLICATION_RELATIONS);

        if ($student->user && $student->user->email_verified_at === null) {
            $add('email_unverified', 'Verify your email address before applying.');
        }

        if ($student->placement_opted_out_at !== null) {
            $add('opted_out', 'You opted out of placements this season. Opt back in to apply.');
        }

        if ($student->isDebarred()) {
            $add('debarred', 'You are debarred from placements until '.$student->debarred_until->format('j M Y').($student->debar_reason ? ": {$student->debar_reason}" : '.'));
        }

        $applications = $student->jobApplications->where('job_posting_id', '!=', $job->id);
        $placed = $applications->first(fn (JobApplication $application) => $application->status === ApplicationStatus::Placed);

        if ($placed && $policy->one_offer_rule) {
            $dreamMin = $policy->dream_offer_enabled ? (float) $policy->dream_offer_min_ctc : null;
            $isDream = $dreamMin !== null && ($job->ctcLpa() ?? 0) >= $dreamMin;
            $usedDream = $dreamMin !== null && $applications->contains(
                fn (JobApplication $application) => $application->id !== $placed->id && ($application->jobPosting?->ctcLpa() ?? 0) >= $dreamMin
                    && $application->applied_at > $placed->responded_at,
            );

            if (! $isDream || $usedDream) {
                $company = $placed->jobPosting?->company?->name ?? 'a company';
                $add('already_placed', $isDream
                    ? "You have already used your dream-offer application after accepting {$company}'s offer."
                    : "You accepted an offer from {$company}. Under the one-offer rule you can only apply to dream jobs".($dreamMin !== null ? " (CTC {$this->lpa($dreamMin)} LPA or more)." : '.'));
            }
        }

        $cap = $policy->max_active_applications;
        $active = $applications->filter(fn (JobApplication $application) => $application->status->isActive())->count();

        if ($cap !== null && $active >= $cap) {
            $add('application_limit', "You already have {$active} active applications; the limit is {$cap}. Withdraw one to apply.");
        }

        $minimum = (int) $policy->min_profile_completion;

        if ($minimum > 0) {
            $percent = $this->completeness->for($student)['percent'];

            if ($percent < $minimum) {
                $add('profile_incomplete', "Your profile is {$percent}% complete; at least {$minimum}% is required.");
            }
        }

        return $blockers;
    }

    public function policy(): PlacementPolicy
    {
        return $this->policy ??= PlacementPolicy::current();
    }

    private function lpa(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
    }
}
