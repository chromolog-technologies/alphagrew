<?php

namespace App\Actions\Placement;

use App\Enums\ApplicationStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\JobApplication;
use App\Models\User;
use App\Notifications\Placement\ApplicationStatusChanged;
use Illuminate\Support\Facades\DB;

/**
 * The one place an application changes status: checks the lifecycle
 * (ApplicationStatus::allowedNext), stamps the decision dates, writes the history event and
 * tells the student. Offers have their own actions because they carry extra data.
 */
class TransitionApplicationAction
{
    public function execute(JobApplication $application, ApplicationStatus $to, ?User $actor, ?string $note = null, bool $notify = true): JobApplication
    {
        $from = $application->status;

        if (! $from->canMoveTo($to)) {
            throw BusinessRuleException::unprocessable("An application that is {$from->label()} cannot move to {$to->label()}.", [
                'applicationId' => $application->id,
                'allowed' => array_map(fn (ApplicationStatus $status) => $status->value, $from->allowedNext()),
            ]);
        }

        DB::transaction(function () use ($application, $from, $to, $actor, $note): void {
            $application->status = $to;

            if ($to === ApplicationStatus::Withdrawn) {
                $application->withdrawn_at = now();
            }

            if ($to->isFinal()) {
                $application->decided_at = now();
            }

            $application->save();

            $application->events()->create([
                'from_status' => $from->value,
                'to_status' => $to->value,
                'actor_id' => $actor?->id,
                'note' => $note,
            ]);
        });

        // A student who withdraws does not need telling.
        if ($notify && ! ($to === ApplicationStatus::Withdrawn && $actor !== null && $actor->id === $application->student?->user_id)) {
            self::notifyStudent($application, $note);
        }

        return $application;
    }

    public static function notifyStudent(JobApplication $application, ?string $note): void
    {
        $application->loadMissing('student.user', 'jobPosting.company');
        $user = $application->student?->user;

        if (! $user) {
            return;
        }

        $user->notify(new ApplicationStatusChanged(
            $application->id,
            $application->job_posting_id,
            (string) $application->jobPosting?->title,
            (string) ($application->jobPosting?->company?->name ?? 'The company'),
            $application->status->value,
            $application->status->label(),
            $note,
        ));
    }
}
