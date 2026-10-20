<?php

namespace App\Services\Ai;

use App\Models\AiUsageLog;
use App\Services\Ai\Providers\AiProvider;
use App\Services\Ai\Providers\AiProviderException;
use App\Services\Ai\Providers\AnthropicProvider;
use App\Support\Tenancy\Tenant;

/**
 * The only way the application calls an LLM (spec §2, §6).
 *
 * - Walks config('ai.chain') ("provider:model" entries), skipping providers without keys;
 *   an error, refusal or malformed JSON moves on to the next entry.
 * - Every attempt is written to ai_usage_logs with tokens, latency and estimated cost.
 * - Returns null when AI is off or every entry failed: callers then use their deterministic
 *   engine, so no student-facing step depends on a provider being up.
 */
class AiClient
{
    /** Name recorded when the deterministic engines produced a result instead of an LLM. */
    public const RULES_ENGINE = 'rules-1.0';

    /** @var array<string, AiProvider> */
    private array $providers;

    private ?string $lastModel = null;

    public function __construct(AnthropicProvider $anthropic)
    {
        $this->providers = [$anthropic->name() => $anthropic];
    }

    public function enabled(): bool
    {
        return $this->chain() !== [];
    }

    /**
     * @return array<string, mixed>|null the decoded JSON object, or null to use the fallback engine
     */
    public function json(AiRequest $request): ?array
    {
        foreach ($this->chain() as [$provider, $model]) {
            $started = hrtime(true);

            try {
                $result = $provider->complete($request, $model);
            } catch (AiProviderException $e) {
                $this->log($request, $provider, $model, $e->status, $e->promptTokens, $e->completionTokens, $started, $e->getMessage());

                continue;
            }

            $data = $this->decode($result->text);

            if ($data === null) {
                $this->log($request, $provider, $result->model, 'invalid_output', $result->promptTokens, $result->completionTokens, $started, 'Reply was not a JSON object');

                continue;
            }

            $this->log($request, $provider, $result->model, 'success', $result->promptTokens, $result->completionTokens, $started);
            $this->lastModel = $result->model;

            return $data;
        }

        return null;
    }

    /**
     * What produced the last result, for model_version / model_name columns: the model that
     * answered the last successful json() call, or the deterministic engine.
     */
    public function engineName(?array $aiResult): string
    {
        return $aiResult !== null && $this->lastModel !== null ? $this->lastModel : self::RULES_ENGINE;
    }

    /** @return list<array{0: AiProvider, 1: string}> */
    private function chain(): array
    {
        $chain = [];

        foreach (config('ai.chain', []) as $entry) {
            [$name, $model] = array_pad(explode(':', $entry, 2), 2, '');
            $provider = $this->providers[$name] ?? null;

            if ($provider && $model !== '' && $provider->available()) {
                $chain[] = [$provider, $model];
            }
        }

        return $chain;
    }

    /** @return array<string, mixed>|null */
    private function decode(string $text): ?array
    {
        $text = trim($text);
        $text = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $text) ?? $text;
        $data = json_decode($text, true);

        return is_array($data) && ! array_is_list($data) ? $data : null;
    }

    private function log(AiRequest $request, AiProvider $provider, string $model, string $status, int $promptTokens, int $completionTokens, int $started, ?string $error = null): void
    {
        [$inputPrice, $outputPrice] = config("ai.prices.{$model}", [0, 0]);

        AiUsageLog::query()->create([
            'institution_id' => app(Tenant::class)->id() ?? $request->subject?->getAttribute('institution_id'),
            'user_id' => $request->userId ?? auth()->id(),
            'feature' => $request->feature,
            'provider' => $provider->name(),
            'model' => $model,
            'status' => $status,
            'subject_type' => $request->subject?->getMorphClass(),
            'subject_id' => $request->subject?->getKey(),
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'latency_ms' => (int) ((hrtime(true) - $started) / 1_000_000),
            'estimated_cost_usd' => round(($promptTokens * $inputPrice + $completionTokens * $outputPrice) / 1_000_000, 6),
            'error' => $error ? mb_substr($error, 0, 255) : null,
        ]);
    }
}
