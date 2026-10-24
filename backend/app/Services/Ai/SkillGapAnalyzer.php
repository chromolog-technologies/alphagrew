<?php

namespace App\Services\Ai;

use App\Models\AiInterview;
use App\Models\AiInterviewEvaluation;
use App\Models\Skill;
use App\Models\StudentSkill;
use App\Support\Interviews\RoleCompetencyModel;
use Illuminate\Support\Collection;

/**
 * Stage 12 — compares what the student demonstrated against the target role's competency
 * model (spec §5.2). Deterministic, so the same evidence always gives the same report.
 *
 * Evidence per competency, strongest first: interview score → assessment-verified skill level →
 * a skill only claimed on the resume or profile (status "unverified", half credit) → none.
 * Status: exceeds | meets | gap | missing | unverified.
 */
class SkillGapAnalyzer
{
    /**
     * @return array{target_role: string, overall_match_percentage: float, skill_breakdown: list<array>}
     */
    public function analyze(AiInterview $interview, AiInterviewEvaluation $evaluation): array
    {
        $model = collect(RoleCompetencyModel::forRole($interview->target_role, $interview->target_experience_level))
            ->concat($this->jobSkills($interview));
        $interviewScores = collect($evaluation->competency_breakdown);
        $skills = StudentSkill::query()->with('skill:id,name')->where('student_id', $interview->student_id)->get();

        $weighted = 0.0;
        $breakdown = $model->map(function (array $competency) use ($interviewScores, $skills, &$weighted): array {
            $expected = RoleCompetencyModel::LEVELS[$competency['level']];
            [$demonstrated, $evidence] = $this->demonstrated($competency, $interviewScores, $skills);
            $level = RoleCompetencyModel::LEVELS[$demonstrated];

            $status = match (true) {
                $evidence === 'claimed' => 'unverified',
                $level === 0 => 'missing',
                $level > $expected => 'exceeds',
                $level === $expected => 'meets',
                default => 'gap',
            };
            $credit = $expected === 0 ? 1 : min(1, $level / $expected);
            $weighted += $competency['weight'] * ($status === 'unverified' ? $credit / 2 : $credit);

            return array_filter([
                'skill' => $competency['name'],
                'expectedLevel' => $competency['level'],
                'demonstratedLevel' => $demonstrated,
                'status' => $status,
                'evidence' => $evidence,
                'remediation' => in_array($status, ['gap', 'missing', 'unverified'], true)
                    ? RoleCompetencyModel::remediation($competency['category'], $competency['name'])
                    : null,
            ], fn ($value) => $value !== null);
        });

        return [
            'target_role' => $interview->target_role,
            'overall_match_percentage' => round($weighted / max(1, $model->sum('weight')) * 100, 2),
            'skill_breakdown' => $breakdown->values()->all(),
        ];
    }

    /** @return array{0: string, 1: string} demonstrated level name and evidence source */
    private function demonstrated(array $competency, Collection $interviewScores, Collection $skills): array
    {
        $keywords = collect($competency['keywords'] ?? [])->push(strtolower($competency['name']));
        // Whole-word keyword match, so a skill like "Go" never matches "algorithms".
        $matches = fn (string $text) => $keywords->contains(fn (string $k) => (bool) preg_match('/(?<![\w])'.preg_quote($k, '/').'(?![\w])/i', $text));

        $asked = $interviewScores->filter(fn (array $c) => strtolower($c['competency']) === strtolower($competency['name']) || $matches($c['competency']));
        if ($asked->isNotEmpty()) {
            return [RoleCompetencyModel::levelForScore((int) $asked->max('score')), 'interview'];
        }

        $owned = $skills->filter(fn (StudentSkill $s) => $s->skill && $matches($s->skill->name));
        if ($verified = $owned->whereNotNull('verified_level')->max('verified_level')) {
            return [RoleCompetencyModel::levelForSkill((int) $verified), 'assessment'];
        }
        if ($claimed = $owned->max('level')) {
            return [RoleCompetencyModel::levelForSkill((int) $claimed), 'claimed'];
        }

        return ['none', 'none'];
    }

    /** Required skills of a linked campus job posting, as extra competencies. */
    private function jobSkills(AiInterview $interview): Collection
    {
        $required = collect($interview->jobPosting?->required_skills ?? [])->filter(fn ($r) => isset($r['skillId']));

        if ($required->isEmpty()) {
            return collect();
        }

        $names = Skill::withoutGlobalScopes()->whereIn('id', $required->pluck('skillId'))->pluck('name', 'id');

        return $required->filter(fn ($r) => $names->has($r['skillId']))->map(fn (array $r) => [
            'name' => $names[$r['skillId']],
            'category' => 'project',
            'level' => RoleCompetencyModel::levelForSkill(max(1, (int) ($r['minLevel'] ?? 3))),
            'weight' => (int) ($r['weight'] ?? 10),
            'keywords' => [strtolower($names[$r['skillId']])],
        ])->values();
    }
}
