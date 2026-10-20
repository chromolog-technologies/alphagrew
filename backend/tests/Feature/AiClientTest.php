<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Services\Ai\AiClient;
use App\Services\Ai\AiRequest;
use App\Services\Ai\JsonSchema;
use App\Services\Resumes\ResumeParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * AI Interview Journey §2 and §6: every LLM call goes through AiClient, with the model
 * fallback chain and an ai_usage_logs row (tokens, latency, cost) per attempt.
 */
class AiClientTest extends TestCase
{
    use RefreshDatabase;

    private const URL = 'https://api.anthropic.com/v1/messages';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'ai.providers.anthropic.key' => 'test-key',
            'ai.chain' => ['anthropic:claude-opus-5-5', 'anthropic:claude-haiku-5-5'],
        ]);
    }

    public function test_a_structured_output_request_is_sent_and_logged(): void
    {
        Http::fake([self::URL => Http::response($this->message('{"question": "What is an index?"}', 'claude-opus-5-5'))]);

        $result = app(AiClient::class)->json($this->request());

        $this->assertSame(['question' => 'What is an index?'], $result);

        Http::assertSent(function (Request $request): bool {
            return $request->url() === self::URL
                && $request->hasHeader('x-api-key', 'test-key')
                && $request->hasHeader('anthropic-version', '2023-06-01')
                && $request->hasHeader('anthropic-beta', 'server-side-fallback-2026-07-01')
                && $request['model'] === 'claude-opus-5-5'
                && $request['fallbacks'] === 'default'
                && $request['output_config']['effort'] === 'low'
                && $request['output_config']['format']['type'] === 'json_schema'
                && $request['output_config']['format']['schema']['additionalProperties'] === false
                && $request['messages'][0]['role'] === 'user';
        });

        $log = AiUsageLog::query()->sole();
        $this->assertSame(['interview_turn', 'anthropic', 'claude-opus-5-5', 'success', 1000, 200],
            [$log->feature, $log->provider, $log->model, $log->status, $log->prompt_tokens, $log->completion_tokens]);
        $this->assertEqualsWithDelta(0.008, $log->estimated_cost_usd, 0.000001); // 1000 × $4/M + 200 × $20/M
    }

    public function test_errors_and_refusals_fall_through_the_chain(): void
    {
        Http::fakeSequence(self::URL)
            ->push(['error' => ['message' => 'Overloaded']], 529)
            ->push($this->message('', 'claude-haiku-5-5', 'refusal'));

        $this->assertNull(app(AiClient::class)->json($this->request()));
        $this->assertSame(['error', 'refused'], AiUsageLog::query()->orderBy('id')->pluck('status')->all());

        // Haiku has no server-side refusal fallback, so it is sent without the parameter.
        Http::assertSent(fn (Request $request) => $request['model'] === 'claude-haiku-5-5' && ! isset($request['fallbacks']));
    }

    public function test_a_reply_that_is_not_a_json_object_moves_to_the_next_model(): void
    {
        Http::fakeSequence(self::URL)
            ->push($this->message('Sure! Here is a question.', 'claude-opus-5-5'))
            ->push($this->message("```json\n{\"question\": \"Fenced but valid\"}\n```", 'claude-haiku-5-5'));

        $this->assertSame(['question' => 'Fenced but valid'], app(AiClient::class)->json($this->request()));
        $this->assertSame(['invalid_output', 'success'], AiUsageLog::query()->orderBy('id')->pluck('status')->all());
    }

    public function test_when_every_model_fails_features_use_their_deterministic_engine(): void
    {
        Http::fake([self::URL => Http::response(['error' => ['message' => 'down']], 500)]);

        $data = app(ResumeParser::class)->structure("Skills\nJava, Python");

        $this->assertSame(['Java', 'Python'], array_column($data['skills'], 'name'));
        $this->assertSame(2, AiUsageLog::query()->where('status', 'error')->count());
    }

    public function test_without_a_key_no_provider_is_called(): void
    {
        config(['ai.providers.anthropic.key' => null]);
        Http::fake();

        $this->assertFalse(app(AiClient::class)->enabled());
        $this->assertNull(app(AiClient::class)->json($this->request()));
        Http::assertNothingSent();
        $this->assertSame(0, AiUsageLog::query()->count());
    }

    private function request(): AiRequest
    {
        return new AiRequest('interview_turn', 'You are an interviewer.', 'Ask a question.', JsonSchema::object(['question' => JsonSchema::string()]));
    }

    private function message(string $text, string $model, string $stopReason = 'end_turn'): array
    {
        return [
            'id' => 'msg_test',
            'type' => 'message',
            'role' => 'assistant',
            'model' => $model,
            'content' => $text === '' ? [] : [['type' => 'text', 'text' => $text]],
            'stop_reason' => $stopReason,
            'stop_details' => $stopReason === 'refusal' ? ['type' => 'refusal', 'category' => null, 'explanation' => null] : null,
            'usage' => ['input_tokens' => 1000, 'output_tokens' => 200],
        ];
    }
}
