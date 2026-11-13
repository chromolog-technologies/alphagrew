<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Account verification & setup notification sent to newly created or invited users
 * (e.g. Institution Admin, Platform Staff, or when clicking "Resend invite / verification").
 */
class VerifyAccountNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $token,
        public readonly ?string $institutionName = null,
        public readonly bool $isResend = false,
    ) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appName = config('app.name', 'Alphagrew');
        $email = $notifiable instanceof User ? $notifiable->getEmailForPasswordReset() : ($notifiable->email ?? '');
        $frontendUrl = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

        $actionUrl = $frontendUrl.'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $email,
            'mode' => 'verify',
        ]);

        $expire = config('auth.passwords.'.config('auth.defaults.passwords', 'users').'.expire', 60);
        $greeting = !empty($notifiable->name) ? "Hello {$notifiable->name}," : 'Hello,';

        $message = (new MailMessage)
            ->subject("Verify your account on {$appName}")
            ->greeting($greeting);

        if ($this->institutionName) {
            $message->line("Welcome to {$appName}! An administrator account has been set up for your institution ({$this->institutionName}).");
        } elseif ($this->isResend) {
            $message->line("Here is your requested verification link to activate and access your {$appName} account.");
        } else {
            $message->line("Welcome to {$appName}! You have been invited to access the platform.");
        }

        $message->line('Please verify your account and set your password to complete your account setup.')
            ->action('Verify Account', $actionUrl)
            ->line("This verification link will expire in {$expire} minutes.")
            ->line('If you were not expecting this invitation, no further action is required.');

        return $message;
    }
}

