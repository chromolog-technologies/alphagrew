<?php

namespace App\Services\Ai;

/**
 * A provider's raw answer: the text plus the token usage reported for it.
 */
final class AiResult
{
    public function __construct(
        public readonly string $text,
        public readonly string $model,
        public readonly int $promptTokens,
        public readonly int $completionTokens,
    ) {
    }
}
