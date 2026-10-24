<?php

namespace App\Services\Ai\Providers;

use RuntimeException;

class AiProviderException extends RuntimeException
{
    /** @param  string  $status  usage-log status: error, refused */
    public function __construct(string $message, public readonly string $status = 'error', public readonly int $promptTokens = 0, public readonly int $completionTokens = 0)
    {
        parent::__construct($message);
    }
}
