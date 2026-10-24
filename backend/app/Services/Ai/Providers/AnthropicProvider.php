<?php

namespace App\Services\Ai\Providers;

use App\Services\Ai\AiRequest;
use App\Services\Ai\AiResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * Claude through the Messages API (POST /v1/messages) with structured outputs:
 * output_config.format = json_schema, so the reply is one JSON object.
 *
 * Calls the REST API directly because the project has no Composer access to add the
 * official anthropic-ai/sdk package; swap this class for an SDK-based one when it can.
 */
class AnthropicProvider implements AiProvider
{
    /** Models that accept the server-side refusal fallback ("fallbacks": "default"). */
    private const SERVER_FALLBACK_MODELS = ['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-1'];

    private const SERVER_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

    public function name(): string
    {
        return 'anthropic';
    }

    public function available(): bool
    {
        return filled(config('ai.providers.anthropic.key'));
    }

    public function complete(AiRequest $request, string $model): AiResult
    {
        $config = config('ai.providers.anthropic');
        $serverFallback = $config['server_fallbacks'] && in_array($model, self::SERVER_FALLBACK_MODELS, true);

        $body = [
            'model' => $model,
            'max_tokens' => $request->maxTokens,
            'system' => $request->system,
            'messages' => [['role' => 'user', 'content' => $request->prompt]],
            'output_config' => [
                'effort' => $request->effort(),
                'format' => ['type' => 'json_schema', 'schema' => $request->schema],
            ],
        ];

        $headers = [
            'x-api-key' => $config['key'],
            'anthropic-version' => $config['version'],
        ];

        if ($serverFallback) {
            $body['fallbacks'] = 'default';
            $headers['anthropic-beta'] = self::SERVER_FALLBACK_BETA;
        }

        try {
            $response = Http::withHeaders($headers)
                ->timeout(config('ai.timeout_seconds'))
                ->acceptJson()
                ->post(rtrim($config['base_url'], '/').'/v1/messages', $body)
                ->throw()
                ->json();
        } catch (RequestException $e) {
            throw new AiProviderException("HTTP {$e->response->status()}: ".mb_substr((string) $e->response->json('error.message', $e->getMessage()), 0, 200));
        } catch (ConnectionException $e) {
            throw new AiProviderException('Connection failed: '.mb_substr($e->getMessage(), 0, 200));
        }

        $promptTokens = (int) data_get($response, 'usage.input_tokens', 0);
        $completionTokens = (int) data_get($response, 'usage.output_tokens', 0);

        // Check why generation stopped before reading content: a refusal (even after any
        // server-side fallback) or a truncated reply is not usable JSON.
        match (data_get($response, 'stop_reason')) {
            'refusal' => throw new AiProviderException(
                'Refused ('.(data_get($response, 'stop_details.category') ?? 'unspecified').')', 'refused', $promptTokens, $completionTokens
            ),
            'max_tokens' => throw new AiProviderException('Output truncated at max_tokens', 'error', $promptTokens, $completionTokens),
            default => null,
        };

        $text = collect(data_get($response, 'content', []))
            ->where('type', 'text')
            ->pluck('text')
            ->implode('');

        return new AiResult($text, (string) data_get($response, 'model', $model), $promptTokens, $completionTokens);
    }
}
