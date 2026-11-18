<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\AiRequest;
use App\Services\Ai\AiResult;

/**
 * An LLM vendor behind AiClient. Implementations throw AiProviderException on any failure
 * (HTTP error, refusal, truncated output) so AiClient can move to the next model.
 */
interface AiProvider
{
    public function name(): string;

    /** Whether credentials are configured. */
    public function available(): bool;

    public function complete(AiRequest $request, string $model): AiResult;
}
