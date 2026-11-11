<?php

namespace App\Notifications;

use App\Models\NotificationPreference;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Base for in-app + email notifications. Every notification has a category, a title, a short
 * body and an optional link into the app; the user's preferences for the category decide the
 * channels. Stored data is the same shape for every type, so the notification list can show
 * any of them.
 */
abstract class CampusNotification extends Notification implements ShouldQueue
{
    use Queueable;

    abstract public function category(): string;

    abstract public function title(): string;

    abstract public function body(): string;

    /** App route the notification opens, e.g. "placement?job=12". */
    public function link(): ?string
    {
        return null;
    }

    /** @return array<string, mixed> extra ids for the client */
    public function meta(): array
    {
        return [];
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        if (! $notifiable instanceof User) {
            return ['mail'];
        }

        $preference = NotificationPreference::for($notifiable, $this->category());

        return array_values(array_filter([
            $preference['inApp'] ? 'database' : null,
            $preference['mail'] && filled($notifiable->email) ? 'mail' : null,
        ]));
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'category' => $this->category(),
            'title' => $this->title(),
            'body' => $this->body(),
            'link' => $this->link(),
            ...$this->meta(),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage())
            ->subject($this->title())
            ->greeting('Hello '.($notifiable->name ?? '').',')
            ->line($this->body());

        if ($link = $this->link()) {
            $mail->action('Open Alpha Grew', config('app.frontend_url').'/?tab='.$link);
        }

        return $mail->line('You can change which emails you receive under Notifications → Preferences.');
    }
}
