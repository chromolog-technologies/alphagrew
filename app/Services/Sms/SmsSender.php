<?php

namespace App\Services\Sms;

/** Sends one text message. Implementations throw on a provider error. */
interface SmsSender
{
    public function send(string $to, string $message): void;
}
