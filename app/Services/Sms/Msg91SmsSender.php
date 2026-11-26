<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * MSG91 Flow API (India). The flow (DLT-approved template) must have one variable, "message",
 * which receives the notification text.
 */
class Msg91SmsSender implements SmsSender
{
    public function __construct(private readonly string $authKey, private readonly string $flowId) {}

    public function send(string $to, string $message): void
    {
        $response = Http::withHeaders(['authkey' => $this->authKey])->timeout(10)
            ->post('https://control.msg91.com/api/v5/flow/', [
                'template_id' => $this->flowId,
                'recipients' => [['mobiles' => ltrim($to, '+'), 'message' => $message]],
            ]);

        if ($response->failed() || $response->json('type') === 'error') {
            throw new RuntimeException('MSG91 rejected the SMS: '.($response->json('message') ?? $response->status()));
        }
    }
}
