<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells a self-registered student whether their registration was approved.
 */
class RegistrationReviewed extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly bool $approved,
        private readonly ?string $reason = null,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        if ($this->approved) {
            return (new MailMessage)
                ->subject('Your registration was approved')
                ->line('Your institution approved your registration. You can now sign in.')
                ->action('Sign in', config('app.frontend_url'));
        }

        return (new MailMessage)
            ->subject('Your registration was not approved')
            ->line('Your institution did not approve your registration.')
            ->line('Reason: '.$this->reason)
            ->line('Contact your institution if you think this is a mistake.');
    }
}
