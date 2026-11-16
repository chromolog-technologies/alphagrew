<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Twilio Messages API. */
class TwilioSmsSender implements SmsSender
{
    public function __construct(private readonly string $sid, private readonly string $token, private readonly string $from) {}

    public function send(string $to, string $message): void
    {
        $response = Http::asForm()->withBasicAuth($this->sid, $this->token)->timeout(10)
            ->post("https://api.twilio.com/2010-04-01/Accounts/{$this->sid}/Messages.json", ['To' => $to, 'From' => $this->from, 'Body' => $message]);

        if ($response->failed()) {
            throw new RuntimeException('Twilio rejected the SMS: '.($response->json('message') ?? $response->status()));
        }
    }
}
