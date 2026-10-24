<?php

namespace App\Services\Ai;

use App\Models\AiRecommendation;
use App\Models\AiResumeAnalysis;
use App\Models\Resume;
use App\Models\SkillGapReport;
use Illuminate\Support\Facades\DB;

/**
 * Stage 13 — practice steps for the student. Each new source replaces the open
 * recommendations of the same kind (done / dismissed ones stay as history).
 */
class RecommendationGenerator
{
    private const BY_STATUS = [
        'missing' => ['type' => 'learning_resource', 'priority' => 'high', 'title' => 'Learn %s'],
        'gap' => ['type' => 'practice_set', 'priority' => 'medium', 'title' => 'Practise %s'],
        'unverified' => ['type' => 'mock_interview', 'priority' => 'low', 'title' => 'Show your %s skills in an interview or assessment'],
    ];

    public function fromSkillGap(SkillGapReport $report): int
    {
        $rows = collect($report->skill_breakdown)
            ->filter(fn (array $item) => isset(self::BY_STATUS[$item['status']]))
            ->sortBy(fn (array $item) => array_search($item['status'], array_keys(self::BY_STATUS), true))
            ->map(fn (array $item) => [
                'type' => self::BY_STATUS[$item['status']]['type'],
                'priority' => self::BY_STATUS[$item['status']]['priority'],
                'title' => sprintf(self::BY_STATUS[$item['status']]['title'], $item['skill']),
                'detail' => $item['remediation'] ?? '',
                'skill' => mb_substr($item['skill'], 0, 100),
                'action' => ['practice' => ['skill' => $item['skill'], 'targetLevel' => $item['expectedLevel']]],
            ]);

        return $this->replace($report->student_id, AiRecommendation::SOURCE_SKILL_GAP, $report->id, $rows->values()->all());
    }

    public function fromResumeAnalysis(Resume $resume, AiResumeAnalysis $analysis): int
    {
        $rows = collect($analysis->improvements)->map(fn (array $tip) => [
            'type' => 'resume_fix',
            'priority' => 'medium',
            'title' => mb_substr($tip['title'], 0, 255),
            'detail' => trim(($tip['detail'] ?? '').(isset($tip['example']) ? " Example: {$tip['example']}" : '')),
            'skill' => null,
            'action' => ['resume' => ['resumeId' => $resume->id]],
        ]);

        return $this->replace($resume->student_id, AiRecommendation::SOURCE_RESUME, $analysis->id, $rows->all());
    }

    /** @param  list<array<string, mixed>>  $rows */
    private function replace(int $studentId, string $sourceType, int $sourceId, array $rows): int
    {
        return DB::transaction(function () use ($studentId, $sourceType, $sourceId, $rows): int {
            AiRecommendation::query()
                ->where('student_id', $studentId)
                ->where('source_type', $sourceType)
                ->where('status', AiRecommendation::STATUS_OPEN)
                ->delete();

            foreach ($rows as $row) {
                AiRecommendation::query()->create([
                    ...$row,
                    'student_id' => $studentId,
                    'source_type' => $sourceType,
                    'source_id' => $sourceId,
                    'status' => AiRecommendation::STATUS_OPEN,
                ]);
            }

            return count($rows);
        });
    }
}
