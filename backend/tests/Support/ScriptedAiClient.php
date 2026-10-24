<?php

namespace Tests\Support;

use App\Services\Ai\AiClient;
use App\Services\Ai\AiRequest;
use App\Services\Ai\Providers\AnthropicProvider;

/**
 * AiClient test double: answers chosen features with scripted JSON (a fixed array, or a queue
 * consumed one call at a time) and returns null for everything else, so those features use
 * their deterministic engines. Records every request.
 */
class ScriptedAiClient extends AiClient
{
    /** @var list<AiRequest> */
    public array $requests = [];

    /** @param  array<string, array|list<array>>  $scripts  feature => response, or ['queue' => [responses...]] */
    public function __construct(private array $scripts)
    {
        parent::__construct(new AnthropicProvider());
    }

    public function enabled(): bool
    {
        return true;
    }

    public function json(AiRequest $request): ?array
    {
        $this->requests[] = $request;
        $script = $this->scripts[$request->feature] ?? null;

        if (is_array($script) && array_key_exists('queue', $script)) {
            return array_shift($this->scripts[$request->feature]['queue']);
        }

        return $script;
    }

    public function engineName(?array $aiResult): string
    {
        return $aiResult !== null ? 'scripted-model' : self::RULES_ENGINE;
    }
}
