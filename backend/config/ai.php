<?php

/*
| AI Interview Journey (documentation/ai-interview-journey-backend-spec.md).
|
| Every LLM call goes through App\Services\Ai\AiClient. With no provider key configured
| the AI layer is off and every stage uses its deterministic engine instead (resume
| parsing heuristics, question bank, rule-based scoring), so the journey works offline
| and in tests.
*/

return [

    /*
    | Fallback chain, tried in order: "provider:model". A provider whose key is missing is
    | skipped. On an error, timeout, refusal or malformed JSON the next entry is tried; when
    | all fail the caller falls back to its deterministic engine.
    */
    'chain' => array_values(array_filter(array_map('trim', explode(',', (string) env('AI_CHAIN', 'anthropic:claude-opus-5-5'))))),

    'timeout_seconds' => (int) env('AI_TIMEOUT', 30),

    'providers' => [
        'anthropic' => [
            'key' => env('ANTHROPIC_API_KEY'),
            'base_url' => env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
            'version' => '2023-06-01',
            // Server-side refusal fallback ("fallbacks": "default"): a request declined by the
            // model's safety classifiers is re-run on a suitable fallback model in the same call.
            'server_fallbacks' => (bool) env('ANTHROPIC_SERVER_FALLBACKS', true),
        ],
    ],

    // USD per million tokens [input, output], for ai_usage_logs.estimated_cost_usd.
    'prices' => [
        'claude-opus-5-5' => [4.00, 20.00],
        'claude-sonnet-5-5' => [2.00, 10.00],
        'claude-haiku-5-5' => [0.10, 0.50],
    ],

    // Effort per feature: per-turn work is latency-sensitive; the final evaluation is not.
    'effort' => [
        'resume_parse' => 'low',
        'resume_analysis' => 'medium',
        'interview_plan' => 'low',
        'interview_turn' => 'low',
        'interview_turn_analysis' => 'low',
        'interview_evaluation' => 'medium',
    ],

    'resumes' => [
        'disk' => env('RESUME_DISK', 'local'),
        'max_kb' => 5120,
        'max_per_student' => 10,
        // Optional poppler `pdftotext` binary; used before the built-in PDF reader when set.
        'pdftotext' => env('PDFTOTEXT_PATH'),
    ],

    'interviews' => [
        'max_turns' => 20,
        'idle_minutes' => 15,
        'audio_disk' => env('INTERVIEW_AUDIO_DISK', 'local'),
    ],

    // Requests per user per minute (PRD §8.2). "ai" covers starting sessions and resume
    // analyses; "answers" covers interview answers, which also call the AI layer.
    'rate_limits' => [
        'ai' => (int) env('AI_RATE_LIMIT_PER_MINUTE', 5),
        'answers' => (int) env('AI_ANSWER_RATE_LIMIT_PER_MINUTE', 30),
    ],

    // Speech-to-text for voice answers: an OpenAI-compatible /audio/transcriptions endpoint
    // (e.g. Whisper). Voice answers are refused while no URL is configured.
    'transcription' => [
        'url' => env('AI_TRANSCRIPTION_URL'),
        'key' => env('AI_TRANSCRIPTION_KEY'),
        'model' => env('AI_TRANSCRIPTION_MODEL', 'whisper-1'),
    ],
];
