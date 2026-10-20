<?php

namespace App\Services\Ai;

use Illuminate\Database\Eloquent\Model;

/**
 * One structured-output LLM call. The answer must be a JSON object matching $schema.
 *
 * Untrusted text (resume content, student answers) belongs in $prompt inside clearly
 * labelled tags, never in $system: the system prompt carries the rules.
 */
final class AiRequest
{
    /**
     * @param  string  $feature  usage-log feature, e.g. interview_turn, resume_parse
     * @param  array<string, mixed>  $schema  JSON Schema of the expected object
     */
    public function __construct(
        public readonly string $feature,
        public readonly string $system,
        public readonly string $prompt,
        public readonly array $schema,
        public readonly int $maxTokens = 4096,
        public readonly ?int $userId = null,
        public readonly ?Model $subject = null,
    ) {
    }

    public function effort(): string
    {
        return config("ai.effort.{$this->feature}", 'low');
    }
}
