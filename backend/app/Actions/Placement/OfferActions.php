<?php

namespace App\Actions\Placement;

use App\Enums\ApplicationStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\JobApplication;
use App\Models\User;
use App\Notifications\Placement\OfferExpired;
use App\Notifications\Placement\OfferIssued;
use App\Notifications\Placement\OfferResponded;
use App\Services\Placement\PlacementGate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Offers (PRD v1.1 §6): an officer offers a selected student; the student accepts or declines
 * by the respond-by date (default: the policy's offer_response_days); unanswered offers expire.
 * Accepting under the one-offer rule withdraws the student's other open applications and
 * declines their other pending offers.
 */
class OfferActions
{
    public function __construct(
        private readonly TransitionApplicationAction $transition,
        private readonly PlacementGate $gate,
    ) {
    }

    public function issue(User $actor, JobApplication $application, ?float $ctcLpa, ?Carbon $respondBy, ?string $note): JobApplication
    {
        if ($application->status !== ApplicationStatus::Selected) {
            throw BusinessRuleException::unprocessable('Only selected candidates can be made an offer. Move the application to Selected first.');
        }

        $respondBy ??= now()->addDays($this->gate->policy()->offer_response_days ?: 7)->endOfDay();

        if ($respondBy->isPast()) {
            throw BusinessRuleException::unprocessable('The respond-by date must be in the future.');
        }

        DB::transaction(function () use ($actor, $application, $ctcLpa, $respondBy, $note): void {
            $application->fill([
                'offer_ctc_lpa' => $ctcLpa ?? $application->jobPosting?->ctcLpa(),
                'offered_at' => now(),
                'offer_respond_by' => $respondBy,
                'offer_note' => $note,
            ]);
            $this->transition->execute($application, ApplicationStatus::Offered, $actor, $note, notify: false);
        });

        $application->loadMissing('student.user', 'jobPosting.company');
        $application->student?->user?->notify(new OfferIssued(
            $application->id,
            $application->job_posting_id,
            (string) $application->jobPosting?->title,
            (string) ($application->jobPosting?->company?->name ?? 'The company'),
            $application->offer_ctc_lpa !== null ? rtrim(rtrim(number_format($application->offer_ctc_lpa, 2, '.', ''), '0'), '.') : null,
            $respondBy->format('j M Y'),
        ));

        return $application;
    }

    public function respond(User $user, JobApplication $application, bool $accept): JobApplication
    {
        $student = $user->student;

        if (! $student || $application->student_id !== $student->id) {
            throw BusinessRuleException::forbidden('This is not your application.');
        }

        if ($application->status !== ApplicationStatus::Offered) {
            throw BusinessRuleException::unprocessable('There is no open offer on this application.');
        }

        if ($application->offer_respond_by?->isPast()) {
            $this->expire($application);

            throw BusinessRuleException::unprocessable('This offer expired on '.$application->offer_respond_by->format('j M Y').'.');
        }

        $company = (string) ($application->jobPosting?->company?->name ?? 'the company');

        DB::transaction(function () use ($user, $application, $accept, $student, $company): void {
            $application->responded_at = now();
            $this->transition->execute($application, $accept ? ApplicationStatus::Placed : ApplicationStatus::OfferDeclined, $user, notify: false);

            if (! $accept) {
                return;
            }

            $student->forceFill(['placed_company' => $company, 'status' => 'Placed'])->save();

            if (! $this->gate->policy()->one_offer_rule) {
                return;
            }

            $others = JobApplication::query()
                ->where('student_id', $student->id)
                ->whereKeyNot($application->id)
                ->whereIn('status', ApplicationStatus::activeValues())
                ->get();

            foreach ($others as $other) {
                $next = $other->status === ApplicationStatus::Offered ? ApplicationStatus::OfferDeclined : ApplicationStatus::Withdrawn;
                $this->transition->execute($other, $next, null, "Closed automatically: accepted an offer from {$company} (one-offer rule).");
            }
        });

        $this->notifyCreator($application, $accept ? 'accepted' : 'declined');

        return $application;
    }

    /** Expires every offer past its respond-by date; returns how many. */
    public function expireDue(): int
    {
        $due = JobApplication::query()
            ->where('status', ApplicationStatus::Offered->value)
            ->whereNotNull('offer_respond_by')
            ->where('offer_respond_by', '<', now())
            ->get();

        $due->each(fn (JobApplication $application) => $this->expire($application));

        return $due->count();
    }

    private function expire(JobApplication $application): void
    {
        $this->transition->execute($application, ApplicationStatus::OfferExpired, null, 'No response by the deadline.', notify: false);
        $application->loadMissing('student.user', 'jobPosting.company');
        $application->student?->user?->notify(new OfferExpired(
            $application->id,
            $application->job_posting_id,
            (string) $application->jobPosting?->title,
            (string) ($application->jobPosting?->company?->name ?? 'The company'),
        ));
        $this->notifyCreator($application, 'did not respond to');
    }

    private function notifyCreator(JobApplication $application, string $response): void
    {
        $application->loadMissing('student', 'jobPosting.company');
        $creator = $application->jobPosting?->created_by ? User::query()->find($application->jobPosting->created_by) : null;

        $creator?->notify(new OfferResponded(
            $application->id,
            $application->job_posting_id,
            (string) $application->jobPosting?->title,
            (string) ($application->jobPosting?->company?->name ?? 'the company'),
            (string) $application->student?->name,
            (string) $application->student?->registration_number,
            $response,
        ));
    }
}
