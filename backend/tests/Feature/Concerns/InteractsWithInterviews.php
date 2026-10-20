<?php

namespace Tests\Feature\Concerns;

use App\Services\Ai\AiClient;
use Illuminate\Testing\TestResponse;
use Tests\Support\ScriptedAiClient;

/**
 * Drives the AI interview API as the demo student (student@demo.com, password demo123).
 */
trait InteractsWithInterviews
{
    /** @var array<string, string> */
    private array $interviewTokens = [];

    protected function asUser(string $email = 'student@demo.com'): static
    {
        $this->app['auth']->forgetGuards();

        $this->interviewTokens[$email] ??= (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])
            ->assertOk()
            ->json('token');

        return $this->withToken($this->interviewTokens[$email]);
    }

    protected function scriptAi(array $scripts): ScriptedAiClient
    {
        $client = new ScriptedAiClient($scripts);
        $this->app->instance(AiClient::class, $client);

        return $client;
    }

    /** Creates and starts an interview; returns [interviewId, firstTurn]. */
    protected function startInterview(array $overrides = []): array
    {
        $id = $this->asUser()->postJson('/api/v1/students/me/interviews', [
            'mode' => 'technical',
            'targetRole' => 'Backend Engineer',
            'targetExperienceLevel' => 'fresher',
            'baseDifficulty' => 2,
            'timeLimitMinutes' => 25,
            ...$overrides,
        ])->assertCreated()->json('data.id');

        $turn = $this->asUser()->postJson("/api/v1/interviews/{$id}/start", ['consentAccepted' => true])
            ->assertOk()
            ->json('data.firstTurn');

        return [$id, $turn];
    }

    protected function answer(int $interviewId, int $turnId, string $text): TestResponse
    {
        return $this->asUser()->postJson("/api/v1/interviews/{$interviewId}/turns/{$turnId}/answer", ['answerText' => $text]);
    }

    /** A quick-signal script for the turn analyser. */
    protected static function signal(int $technical, string $depth, array $extra = []): array
    {
        return [
            'relevance' => 90, 'technicalScore' => $technical, 'clarity' => 85, 'depth' => $depth,
            'isVague' => false, 'saysDontKnow' => false, 'claimDetected' => false, 'claimText' => null,
            'summary' => 'Scripted.', ...$extra,
        ];
    }
}
