<?php

namespace App\Notifications;

use App\Models\Invitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Email with the link to accept an invitation. Sent to an address, not a user
 * (Notification::route('mail', ...)), because the account doesn't exist yet.
 */
class InvitationSent extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Invitation $invitation,
        public readonly string $token,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $institution = $this->invitation->institution()->value('name') ?? config('app.name');
        $role = str_replace('_', ' ', $this->invitation->role);

        return (new MailMessage)
            ->subject("You're invited to join {$institution} on ".config('app.name'))
            ->line("{$institution} has invited you to join as a {$role}.")
            ->action('Accept invitation', config('app.frontend_url').'/invitations/accept?token='.urlencode($this->token))
            ->line('This link expires on '.$this->invitation->expires_at->toFormattedDayDateString().'.')
            ->line('If you were not expecting this invitation, you can ignore this email.');
    }
}
