<?php

namespace App\Services\Ai;

use App\Exceptions\BusinessRuleException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

/**
 * Stage 7 (voice) — turns an answer recording into text through a configurable
 * OpenAI-compatible /audio/transcriptions endpoint (e.g. Whisper). Voice answers are refused
 * until config('ai.transcription.url') is set; text answers always work.
 */
class SpeechTranscriber
{
    public function enabled(): bool
    {
        return filled(config('ai.transcription.url'));
    }

    public function transcribe(UploadedFile $audio): string
    {
        if (! $this->enabled()) {
            throw BusinessRuleException::unprocessable('Voice answers are not enabled for this institution. Please type your answer.');
        }

        $content = $audio->getContent();

        if ($content === '') {
            throw BusinessRuleException::unprocessable('The recording is empty. Please record your answer again.');
        }

        try {
            $text = Http::withToken((string) config('ai.transcription.key'))
                ->timeout(config('ai.timeout_seconds'))
                ->attach('file', $content, $audio->getClientOriginalName() ?: 'answer.webm')
                ->post(config('ai.transcription.url'), ['model' => config('ai.transcription.model')])
                ->throw()
                ->json('text');
        } catch (RequestException|ConnectionException $e) {
            report($e);

            throw BusinessRuleException::unprocessable('We could not transcribe your recording. Please try again or type your answer.');
        }

        if (! is_string($text) || trim($text) === '') {
            throw BusinessRuleException::unprocessable('No speech was detected in the recording. Please try again or type your answer.');
        }

        return trim($text);
    }
}
