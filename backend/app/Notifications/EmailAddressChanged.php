<?php

namespace App\Notifications;

use App\Support\MailText;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to the old address after a user changes their sign-in email, so the real owner
 * notices if someone else changed it.
 */
class EmailAddressChanged extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $name, public string $newEmail) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your '.config('app.name').' sign-in email was changed')
            ->greeting('Hello '.MailText::escape($this->name).',')
            ->line('The sign-in email for your '.config('app.name').' account was changed to '.$this->maskedNewEmail().'.')
            ->line('If you made this change, you can ignore this message.')
            ->line('If you did not, contact your institution\'s administrator or '.config('app.demo_requests_email').' straight away.');
    }

    /** a****@college.edu.in: enough to recognise it, without handing the full address to whoever reads the old inbox. */
    private function maskedNewEmail(): string
    {
        [$local, $domain] = array_pad(explode('@', $this->newEmail, 2), 2, '');

        return mb_substr($local, 0, 1).str_repeat('*', max(mb_strlen($local) - 1, 3)).'@'.$domain;
    }
}
