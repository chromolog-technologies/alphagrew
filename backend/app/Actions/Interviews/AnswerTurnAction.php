<?php

namespace App\Actions\Interviews;

use App\Enums\InterviewStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\AiInterview;
use App\Models\AiInterviewTurn;
use App\Services\Ai\InterviewConductor;
use App\Services\Ai\SpeechTranscriber;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Stages 7–10 — stores the answer (text, or a recording transcribed to text), analyses it,
 * then asks the follow-up or next question at the adapted difficulty. When nothing is left to
 * ask (plan done, time up or turn cap) the interview finishes and evaluation is queued.
 */
class AnswerTurnAction
{
    public function __construct(
        private readonly AnalyzeTurnAction $analyze,
        private readonly InterviewConductor $conductor,
        private readonly FinishInterviewAction $finish,
        private readonly SpeechTranscriber $transcriber,
    ) {
    }

    /**
     * @return array{nextTurn: AiInterviewTurn|null, isCompleted: bool}
     */
    public function execute(AiInterview $interview, AiInterviewTurn $turn, ?string $text, ?UploadedFile $audio): array
    {
        if ($interview->status !== InterviewStatus::InProgress) {
            throw BusinessRuleException::conflict("This interview is {$interview->status->value}; answers are no longer accepted.");
        }

        if ($turn->isAnswered()) {
            throw BusinessRuleException::conflict('This question has already been answered.');
        }

        if ($turn->sequence !== (int) $interview->turns()->max('sequence')) {
            throw BusinessRuleException::conflict('Only the current question can be answered.');
        }

        $audioPath = null;

        if ($audio !== null) {
            $text = $this->transcriber->transcribe($audio);
            $audioPath = $audio->storeAs(
                "institutions/{$interview->institution_id}/interviews/{$interview->id}",
                "turn-{$turn->sequence}-".Str::random(8).'.'.($audio->guessExtension() ?: 'webm'),
                config('ai.interviews.audio_disk'),
            );
        }

        // Claim the turn under a row lock so a double submit cannot answer it twice. The LLM calls
        // below run outside any transaction.
        DB::transaction(function () use ($turn, $text, $audioPath): void {
            if (AiInterviewTurn::query()->whereKey($turn->id)->lockForUpdate()->value('answered_at') !== null) {
                throw BusinessRuleException::conflict('This question has already been answered.');
            }

            $turn->update([
                'answer_text' => trim((string) $text),
                'answer_audio_path' => $audioPath,
                'answered_at' => now(),
                'answer_duration_seconds' => (int) max(0, $turn->asked_at?->diffInSeconds(now()) ?? 0),
            ]);
        });

        $turn->update(['quick_signal' => $this->analyze->execute($interview, $turn, $this->category($interview, $turn))]);

        $next = $this->conductor->advance($interview, $turn);

        if ($next === null) {
            $this->finish->execute($interview, $interview->timeIsUp() ? 'time_limit' : 'completed');
        }

        return ['nextTurn' => $next, 'isCompleted' => $next === null];
    }

    private function category(AiInterview $interview, AiInterviewTurn $turn): string
    {
        $base = str_replace(InterviewConductor::FUNDAMENTALS, '', $turn->competency);

        return collect($interview->plan['competencies'] ?? [])->firstWhere('name', $base)['category'] ?? 'behavioral';
    }
}
