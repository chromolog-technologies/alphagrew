<?php

namespace App\Services\Ai;

use App\Enums\TurnKind;
use App\Models\AiInterview;
use App\Models\AiInterviewTurn;

/**
 * Stages 6–10 — decides what happens after each answer (spec §4.3 flow):
 *
 *   hard limit reached (time / max turns)        → complete
 *   unverified claim or vague answer on a question → one follow-up probe (same competency)
 *   all planned questions asked                  → complete
 *   weak answer (Δ = −1)                         → easier fundamentals question on the same competency
 *   otherwise                                    → next planned competency at the adapted difficulty
 */
class InterviewConductor
{
    public const FUNDAMENTALS = ' — Fundamentals';

    /** @var array<int, array> candidate profile per interview id, built once per request */
    private array $profiles = [];

    public function __construct(private readonly QuestionGenerator $questions, private readonly CandidateProfileBuilder $profileBuilder)
    {
    }

    /** The first question of a session. */
    public function first(AiInterview $interview): AiInterviewTurn
    {
        $competency = $this->nextPlanned($interview) ?? $this->planned($interview)[0];

        return $this->ask($interview, $competency, $interview->current_difficulty, TurnKind::Question);
    }

    /** The turn after an answered one, or null when the interview is complete. */
    public function advance(AiInterview $interview, AiInterviewTurn $answered): ?AiInterviewTurn
    {
        $interview->load('turns');

        if ($interview->timeIsUp() || $interview->turns->count() >= config('ai.interviews.max_turns')) {
            return null;
        }

        $signal = $answered->quick_signal ?? [];
        $competency = $this->competencyOf($interview, $answered);

        if ($answered->kind === TurnKind::Question && ! ($signal['saysDontKnow'] ?? false)) {
            $probe = match (true) {
                (bool) ($signal['claim']['detected'] ?? false) => QuestionGenerator::PROBE_CLAIM,
                (bool) ($signal['isVague'] ?? false) => QuestionGenerator::PROBE_VAGUE,
                default => null,
            };

            if ($probe !== null) {
                return $this->ask($interview, ['name' => $answered->competency, 'category' => $competency['category']], $answered->difficulty, TurnKind::FollowUp, $answered, $probe);
            }
        }

        if ($interview->questionsAsked() >= ($interview->plan['totalTargetTurns'] ?? 8)) {
            return null;
        }

        $delta = AdaptiveDifficulty::delta($interview->turns->filter->isAnswered()->values()->all());
        $difficulty = AdaptiveDifficulty::apply($interview->current_difficulty, $delta);
        $interview->update(['current_difficulty' => $difficulty]);

        if ($delta < 0) {
            return $this->ask($interview, [
                'name' => mb_substr($competency['name'], 0, 100 - mb_strlen(self::FUNDAMENTALS)).self::FUNDAMENTALS,
                'category' => $competency['category'],
            ], $difficulty, TurnKind::Question, $answered, QuestionGenerator::PROBE_FUNDAMENTALS);
        }

        $next = $this->nextPlanned($interview);

        return $next === null ? null : $this->ask($interview, $next, $difficulty, TurnKind::Question);
    }

    private function ask(AiInterview $interview, array $competency, int $difficulty, TurnKind $kind, ?AiInterviewTurn $previous = null, ?string $probe = null): AiInterviewTurn
    {
        $question = $this->questions->generate($interview, $this->profile($interview), $competency, $difficulty, $kind, $previous, $probe);

        $turn = $interview->turns()->create([
            'institution_id' => $interview->institution_id,
            'sequence' => ($interview->turns->max('sequence') ?? 0) + 1,
            'kind' => $kind,
            'competency' => mb_substr($competency['name'], 0, 100),
            'difficulty' => $difficulty,
            'question_text' => $question,
            'asked_at' => now(),
        ]);

        $interview->setRelation('turns', $interview->turns->push($turn));

        return $turn;
    }

    /** The first competency whose planned questions are not all asked (fundamentals pivots count towards it). */
    private function nextPlanned(AiInterview $interview): ?array
    {
        $asked = $interview->turns
            ->where('kind', TurnKind::Question)
            ->countBy(fn (AiInterviewTurn $turn) => $this->baseName($turn->competency));

        foreach ($this->planned($interview) as $competency) {
            if (($asked[$competency['name']] ?? 0) < ($competency['plannedTurns'] ?? 1)) {
                return $competency;
            }
        }

        return null;
    }

    /** @return array{name: string, category: string} the plan entry a turn belongs to */
    private function competencyOf(AiInterview $interview, AiInterviewTurn $turn): array
    {
        $name = $this->baseName($turn->competency);

        return collect($this->planned($interview))->firstWhere('name', $name) ?? ['name' => $name, 'category' => 'behavioral'];
    }

    /** @return list<array{name: string, category: string, weight: int, plannedTurns: int}> */
    private function planned(AiInterview $interview): array
    {
        return $interview->plan['competencies'] ?? [];
    }

    private function baseName(string $competency): string
    {
        return str_ends_with($competency, self::FUNDAMENTALS) ? mb_substr($competency, 0, -mb_strlen(self::FUNDAMENTALS)) : $competency;
    }

    private function profile(AiInterview $interview): array
    {
        return $this->profiles[$interview->id] ??= $this->profileBuilder->build($interview->student, $interview->resume);
    }
}
