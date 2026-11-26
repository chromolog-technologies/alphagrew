<?php

namespace App\Notifications;

use App\Models\Lead;
use App\Support\MailText;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Emails a website demo request to the sales inbox (config app.demo_requests_email).
 * Replying goes straight to the person who asked. The same request is an Owner Console lead.
 */
class DemoRequested extends Notification implements ShouldQueue
{
    use Queueable;

    /** @param  array{role: string, size: ?string, interests: list<string>, message: ?string}  $details */
    public function __construct(public Lead $lead, public array $details) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lead = $this->lead;
        // Everything below was typed by a website visitor: escape it so it cannot add links.
        $e = fn (?string $text): string => MailText::escape($text);
        $mail = (new MailMessage)
            ->subject('Demo request: '.$lead->organization_name)
            ->replyTo($lead->contact_email, $lead->contact_name)
            ->greeting('New demo request from the website')
            ->line('**Name:** '.$e($lead->contact_name))
            ->line('**Role:** '.$e($this->details['role']))
            ->line('**Institution or company:** '.$e($lead->organization_name))
            ->line('**Email:** '.$e($lead->contact_email));

        if ($lead->contact_phone) {
            $mail->line('**Phone:** '.$e($lead->contact_phone));
        }
        if ($this->details['size']) {
            $mail->line('**Final and pre-final year students:** '.$e($this->details['size']));
        }
        if ($this->details['interests'] !== []) {
            $mail->line('**Interested in:** '.$e(implode(', ', $this->details['interests'])));
        }
        if ($this->details['message']) {
            $mail->line('**Message:**')->line($e($this->details['message']));
        }

        return $mail
            ->action('Open the lead in the Owner Console', rtrim((string) config('app.frontend_url'), '/').'/owner/crm-onboarding')
            ->line('Reply to this email to answer them directly.');
    }
}
