<?php

namespace App\Notifications\Channels;

use App\Services\Sms\SmsManager;
use Illuminate\Notifications\Notification;

/** Sends a notification's toSms() text to the notifiable's phone (routeNotificationForSms). */
class SmsChannel
{
    public function __construct(private readonly SmsManager $sms) {}

    public function send(object $notifiable, Notification $notification): void
    {
        if (! $this->sms->enabled() || ! method_exists($notification, 'toSms')) {
            return;
        }

        $to = SmsManager::normalise($notifiable->routeNotificationFor('sms', $notification));
        if ($to === null) {
            return;
        }

        $this->sms->sender()->send($to, $notification->toSms($notifiable));
    }
}
