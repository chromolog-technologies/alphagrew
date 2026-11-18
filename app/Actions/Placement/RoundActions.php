<?php

namespace App\Actions\Placement;

use App\Enums\ApplicationStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\JobApplication;
use App\Models\JobPosting;
use App\Models\PlacementResult;
use App\Models\PlacementRound;
use App\Models\User;
use App\Notifications\Placement\RoundScheduled;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Selection rounds for a job (aptitude, technical, HR, …) and their results. Candidates are the
 * shortlisted and in-round applications. Recording a result moves the application: passed →
 * in rounds, failed or absent → not selected. The final decision (Selected) is a status change.
 */
class RoundActions
{
    /** Applications that take part in rounds. */
    public const CANDIDATE_STATUSES = [ApplicationStatus::Shortlisted, ApplicationStatus::InRounds];

    public function __construct(private readonly TransitionApplicationAction $transition)
    {
    }

    /** @param array<string, mixed> $data */
    public function schedule(JobPosting $job, array $data): PlacementRound
    {
        $round = $job->rounds()->create([
            'company_id' => $job->company_id,
            'name' => $data['name'],
            'type' => $data['type'],
            'scheduled_at' => $data['scheduledAt'] ?? null,
            'duration_minutes' => $data['durationMinutes'] ?? null,
            'description' => $data['description'] ?? null,
            'sequence' => ($job->rounds()->max('sequence') ?? 0) + 1,
        ]);

        $job->loadMissing('company');
        $users = $this->candidates($job)->map(fn (JobApplication $application) => $application->student?->user)->filter();

        Notification::send($users, new RoundScheduled(
            $job->id,
            $job->title,
            (string) ($job->company?->name ?? 'The company'),
            $round->name,
            $round->scheduled_at?->format('j M Y, H:i'),
            $round->description,
        ));

        return $round;
    }

    /**
     * @param  list<array{applicationId: int, status: string, score?: float|null, feedback?: string|null}>  $results
     * @return int results recorded
     */
    public function recordResults(User $actor, PlacementRound $round, array $results): int
    {
        $applications = JobApplication::query()
            ->where('job_posting_id', $round->job_posting_id)
            ->whereIn('id', array_column($results, 'applicationId'))
            ->get()
            ->keyBy('id');

        $outsiders = array_diff(array_column($results, 'applicationId'), $applications->keys()->all());

        if ($outsiders !== []) {
            throw BusinessRuleException::unprocessable('Some applications are not for this job.', ['applicationIds' => array_values($outsiders)]);
        }

        return DB::transaction(function () use ($actor, $round, $results, $applications): int {
            foreach ($results as $result) {
                $application = $applications[$result['applicationId']];
                $existing = PlacementResult::query()->where('round_id', $round->id)->where('job_application_id', $application->id)->first();

                PlacementResult::query()->updateOrCreate(
                    ['round_id' => $round->id, 'job_application_id' => $application->id],
                    [
                        'student_id' => $application->student_id,
                        'company_id' => $round->company_id,
                        'status' => $result['status'],
                        'score' => $result['score'] ?? null,
                        'feedback' => $result['feedback'] ?? null,
                    ],
                );

                if ($existing?->status === $result['status']) {
                    continue;
                }

                $note = match ($result['status']) {
                    'passed' => "Cleared {$round->name}.",
                    'absent' => "Absent for {$round->name}.",
                    default => "Did not clear {$round->name}.",
                };
                $target = $result['status'] === 'passed' ? ApplicationStatus::InRounds : ApplicationStatus::Rejected;

                if ($application->status->canMoveTo($target)) {
                    $this->transition->execute($application, $target, $actor, $note);
                }
            }

            return count($results);
        });
    }

    /** @return Collection<int, JobApplication> */
    public function candidates(JobPosting $job): Collection
    {
        return JobApplication::query()
            ->with('student.user')
            ->where('job_posting_id', $job->id)
            ->whereIn('status', array_map(fn (ApplicationStatus $status) => $status->value, self::CANDIDATE_STATUSES))
            ->get();
    }
}
