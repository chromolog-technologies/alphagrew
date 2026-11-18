<?php

namespace App\Services\Ai;

use App\Enums\InterviewStatus;
use App\Models\AiInterviewEvaluation;
use App\Models\AiResumeAnalysis;
use App\Models\ReadinessScore;
use App\Models\Student;

/**
 * The institutional readiness score (spec §5.3): resume 20%, academics 25%, assessments 25%,
 * AI mock interviews 30%. A component not measured yet is reported as null and left out, with
 * the remaining weights scaled up — never counted as 0. A coaching indicator, never an
 * employability verdict or an eligibility blocker.
 */
class ReadinessCalculator
{
    public const WEIGHTS = ['resume' => 20, 'academics' => 25, 'assessments' => 25, 'interview' => 30];

    /** Mock interviews averaged into the interview component (most recent first). */
    private const RECENT_INTERVIEWS = 3;

    /** Appends a point to the student's readiness history. */
    public function record(Student $student, string $trigger): ReadinessScore
    {
        return $student->readinessScores()->create([
            'institution_id' => $student->institution_id,
            ...$this->calculate($student),
            'trigger' => $trigger,
            'calculated_at' => now(),
        ]);
    }

    /** @return array{overall: float|null, components: array<string, array>} */
    public function calculate(Student $student): array
    {
        $components = [
            'resume' => $this->resume($student),
            'academics' => $this->academics($student),
            // The assessment engine (Student Journey step 7) is not built yet.
            'assessments' => ['score' => null, 'note' => 'Not measured yet'],
            'interview' => $this->interview($student),
        ];

        $measured = collect($components)->filter(fn (array $c) => $c['score'] !== null);
        $weight = $measured->keys()->sum(fn (string $key) => self::WEIGHTS[$key]);

        return [
            'overall' => $weight > 0 ? round($measured->map(fn (array $c, string $key) => $c['score'] * self::WEIGHTS[$key])->sum() / $weight, 2) : null,
            'components' => collect($components)->map(fn (array $c, string $key) => [...$c, 'weight' => self::WEIGHTS[$key]])->all(),
        ];
    }

    private function resume(Student $student): array
    {
        // The default resume's analysis, else the most recent one.
        $analysis = AiResumeAnalysis::query()
            ->join('resumes', 'resumes.id', '=', 'ai_resume_analyses.resume_id')
            ->where('resumes.student_id', $student->id)
            ->orderByDesc('resumes.is_default')
            ->orderByDesc('ai_resume_analyses.updated_at')
            ->select('ai_resume_analyses.*')
            ->first();

        return $analysis
            ? ['score' => (float) $analysis->overall_score, 'resumeId' => $analysis->resume_id]
            : ['score' => null, 'note' => 'Upload a resume to measure this'];
    }

    /** CGPA on a 0–100 scale, less 10 points per active backlog. */
    private function academics(Student $student): array
    {
        $summary = $student->academicSummary()->first();
        $cgpa = $summary?->cgpa ?? ($student->cgpa > 0 ? $student->cgpa : null);

        if ($cgpa === null) {
            return ['score' => null, 'note' => 'No CGPA recorded yet'];
        }

        $backlogs = (int) ($summary?->active_backlogs ?? 0);

        return [
            'score' => (float) max(0, min(100, $cgpa * 10 - 10 * $backlogs)),
            'cgpa' => (float) $cgpa,
            'activeBacklogs' => $backlogs,
            'source' => $summary?->source ?? 'manual',
        ];
    }

    private function interview(Student $student): array
    {
        $scores = AiInterviewEvaluation::query()
            ->whereHas('interview', fn ($q) => $q->where('student_id', $student->id)->where('status', InterviewStatus::Completed->value))
            ->latest('evaluated_at')
            ->latest('id')
            ->limit(self::RECENT_INTERVIEWS)
            ->pluck('overall_score');

        return $scores->isEmpty()
            ? ['score' => null, 'note' => 'Take an AI mock interview to measure this']
            : ['score' => round($scores->avg(), 2), 'interviewsCounted' => $scores->count()];
    }
}
