<?php

namespace Tests\Feature;

use App\Models\AiInterview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\InteractsWithInterviews;
use Tests\TestCase;

/**
 * Voice answers (stage 7), answering rules and idle sessions.
 */
class InterviewSessionLifecycleTest extends TestCase
{
    use InteractsWithInterviews;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Storage::fake('local');
    }

    public function test_voice_answers_are_transcribed_when_enabled(): void
    {
        [$id, $turn] = $this->startInterview();
        $audio = UploadedFile::fake()->createWithContent('answer.webm', str_repeat("\x1A\x45\xDF\xA3", 64));
        $send = fn () => $this->asUser()->post("/api/v1/interviews/{$id}/turns/{$turn['id']}/answer", ['audio' => $audio], ['Accept' => 'application/json']);

        $send()->assertUnprocessable()->assertJsonPath('message', 'Voice answers are not enabled for this institution. Please type your answer.');

        config(['ai.transcription.url' => 'https://stt.example.test/v1/audio/transcriptions', 'ai.transcription.key' => 'stt-key']);
        Http::fake(['stt.example.test/*' => Http::response(['text' => 'A stack is last in, first out.'])]);

        $send()->assertOk()->assertJsonPath('data.isCompleted', false);

        Http::assertSent(fn (Request $request) => $request->hasHeader('Authorization', 'Bearer stt-key'));
        $answered = AiInterview::query()->findOrFail($id)->turns->first();
        $this->assertSame('A stack is last in, first out.', $answered->answer_text);
        Storage::disk('local')->assertExists($answered->answer_audio_path);
    }

    public function test_answers_endpoint_accepts_turn_id_with_text_and_voice(): void
    {
        [$id, $turn] = $this->startInterview();

        // 1. Text submission via /answers
        $response = $this->asUser()->postJson("/api/v1/interviews/{$id}/answers", [
            'turnId' => $turn['id'],
            'text' => 'An answer about database indexing using B-Trees.',
        ]);
        $response->assertOk()->assertJsonPath('data.isCompleted', false);

        $nextTurn = $response->json('data.nextTurn');
        $this->assertNotNull($nextTurn);

        // 2. Voice submission via /answers with audio upload
        config(['ai.transcription.url' => 'https://stt.example.test/v1/audio/transcriptions', 'ai.transcription.key' => 'stt-key']);
        Http::fake(['stt.example.test/*' => Http::response(['text' => 'ACID transactions guarantee isolation.'])]);

        $audio = UploadedFile::fake()->createWithContent('turn2.webm', str_repeat("\x1A\x45\xDF\xA3", 64));
        $this->asUser()->post("/api/v1/interviews/{$id}/answers", [
            'turnId' => $nextTurn['id'],
            'audio' => $audio,
        ], ['Accept' => 'application/json'])->assertOk();

        $answeredTurn = AiInterview::query()->findOrFail($id)->turns()->whereKey($nextTurn['id'])->first();
        $this->assertSame('ACID transactions guarantee isolation.', $answeredTurn->answer_text);
        Storage::disk('local')->assertExists($answeredTurn->answer_audio_path);
    }

    public function test_only_the_current_unanswered_question_can_be_answered(): void
    {
        [$id, $first] = $this->startInterview();
        $this->answer($id, $first['id'], 'An answer about REST resources, HTTP verbs and status codes because clients rely on them.')->assertOk();

        $this->answer($id, $first['id'], 'Again')->assertStatus(409)->assertJsonPath('message', 'This question has already been answered.');
        $this->asUser()->postJson("/api/v1/interviews/{$id}/turns/{$first['id']}/answer", [])->assertUnprocessable()->assertJsonValidationErrors('answerText');
    }

    public function test_idle_sessions_are_closed(): void
    {
        [$idle, $turn] = $this->startInterview();
        $this->answer($idle, $turn['id'], 'An answer about database indexes because they speed up lookups.')->assertOk();

        $this->travel(20)->minutes();
        $this->artisan('interviews:close-idle')->expectsOutput('Closed 1 idle interviews.')->assertSuccessful();

        // It had an answer, so it was evaluated rather than discarded.
        $interview = AiInterview::query()->findOrFail($idle);
        $this->assertSame(['completed', 'idle_timeout'], [$interview->status->value, $interview->end_reason]);
    }
}
