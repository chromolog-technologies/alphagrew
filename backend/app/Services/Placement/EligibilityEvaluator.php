<?php

namespace App\Services\Placement;

use App\Models\EligibilityRule;
use App\Models\Skill;
use App\Models\Student;
use App\Services\Students\ProfileCompleteness;
use Illuminate\Support\Collection;

/**
 * Deterministic job eligibility (PRD v1.1 §10). Every rule on a job must pass (AND). For each
 * rule the result says what was expected and what the student has, so a student can see
 * exactly why they are not eligible.
 *
 * Facts come from the derived academic summary (CGPA, backlogs, attendance; falling back to
 * the hand-entered student fields), the student's batch, skills and profile completion, and
 * class 10 / 12 scores from **verified** academic records only.
 */
class EligibilityEvaluator
{
    public const LABELS = [
        'cgpa' => 'CGPA',
        'active_backlogs' => 'Active backlogs',
        'backlog_history' => 'Backlog history',
        'attendance_percentage' => 'Attendance %',
        'department' => 'Department',
        'year' => 'Year of study',
        'batch' => 'Batch',
        'class_10_score' => 'Class 10 score %',
        'class_12_score' => 'Class 12 score %',
        'skill' => 'Skill',
        'profile_completion' => 'Profile completion %',
    ];

    private const OPERATOR_SYMBOLS = ['gte' => '≥', 'lte' => '≤', 'eq' => '=', 'in' => 'one of', 'not_in' => 'not'];

    /** @var array<int, array<string, mixed>> facts per student id */
    private array $facts = [];

    /** @var array<int, string> */
    private array $skillNames = [];

    public function __construct(private readonly ProfileCompleteness $completeness)
    {
    }

    /**
     * @param  iterable<EligibilityRule|array{field: string, operator: string, value: mixed}>  $rules
     * @return array{eligible: bool, rules: list<array{field: string, label: string, operator: string, expected: string, actual: string, passed: bool}>}
     */
    public function evaluate(Student $student, iterable $rules): array
    {
        $results = [];

        foreach ($rules as $rule) {
            ['field' => $field, 'operator' => $operator, 'value' => $value] = $rule instanceof EligibilityRule
                ? ['field' => $rule->field, 'operator' => $rule->operator, 'value' => $rule->value]
                : $rule;

            $results[] = $this->check($student, $field, $operator, $value);
        }

        return ['eligible' => collect($results)->every(fn (array $result) => $result['passed']), 'rules' => $results];
    }

    /**
     * Loads what the rules need for many students in a few queries (eligible-student lists).
     *
     * @param  Collection<int, Student>  $students
     * @param  iterable<EligibilityRule|array{field: string}>  $rules
     */
    public function preload(Collection $students, iterable $rules): void
    {
        $fields = collect($rules)->map(fn ($rule) => $rule instanceof EligibilityRule ? $rule->field : $rule['field'])->unique();

        $students->loadMissing(array_filter([
            'academicSummary',
            $fields->contains('batch') ? 'batch' : null,
            $fields->contains('skill') ? 'studentSkills' : null,
            $fields->intersect(['class_10_score', 'class_12_score'])->isNotEmpty() ? 'education' : null,
        ]));
    }

    private function check(Student $student, string $field, string $operator, mixed $value): array
    {
        $label = self::LABELS[$field] ?? $field;

        if ($field === 'skill') {
            $skillId = (int) ($value['skillId'] ?? 0);
            $minLevel = (int) ($value['minLevel'] ?? 1);
            $level = $this->skillLevel($student, $skillId);
            $label = $this->skillName($skillId);

            return $this->result($field, $label, $operator, "level {$minLevel} or higher", $level === null ? 'Not listed' : "level {$level}", $level !== null && $level >= $minLevel);
        }

        $actual = $this->fact($student, $field);

        if (in_array($operator, ['in', 'not_in'], true)) {
            $allowed = array_map(fn ($item) => strtoupper((string) $item), (array) $value);
            $actualValues = array_map(fn ($item) => strtoupper((string) $item), array_filter((array) $actual, fn ($item) => $item !== null && $item !== ''));
            $hit = array_intersect($actualValues, $allowed) !== [];
            $passed = $operator === 'in' ? $hit : ($actualValues !== [] && ! $hit);
            $expected = self::OPERATOR_SYMBOLS[$operator].' '.implode(', ', (array) $value);

            return $this->result($field, $label, $operator, $expected, $actualValues === [] ? 'Not recorded' : implode(', ', (array) $this->displayValue($field, $actual)), $passed);
        }

        $expected = self::OPERATOR_SYMBOLS[$operator].' '.$this->number($value);

        if ($actual === null) {
            return $this->result($field, $label, $operator, $expected, 'Not recorded', false);
        }

        $passed = match ($operator) {
            'gte' => $actual >= (float) $value,
            'lte' => $actual <= (float) $value,
            'eq' => abs($actual - (float) $value) < 0.0001,
            default => false,
        };

        return $this->result($field, $label, $operator, $expected, $this->number($actual), $passed);
    }

    private function result(string $field, string $label, string $operator, string $expected, string $actual, bool $passed): array
    {
        return compact('field', 'label', 'operator', 'expected', 'actual', 'passed');
    }

    private function fact(Student $student, string $field): mixed
    {
        $facts = $this->facts[$student->id] ??= [];

        if (! array_key_exists($field, $facts)) {
            $facts[$field] = $this->loadFact($student, $field);
            $this->facts[$student->id] = $facts;
        }

        return $facts[$field];
    }

    private function loadFact(Student $student, string $field): mixed
    {
        $summary = $student->academicSummary;

        return match ($field) {
            'cgpa' => $this->float($summary?->cgpa ?? $student->cgpa),
            'active_backlogs' => $summary ? (float) $summary->active_backlogs : 0.0,
            'backlog_history' => $summary ? (float) $summary->backlog_history : 0.0,
            'attendance_percentage' => $this->float($summary?->attendance_percentage ?? $student->attendance),
            'department' => $student->department_code,
            'year' => $student->year,
            'batch' => $student->batch ? [$student->batch->code, (string) $student->batch->graduation_year] : [],
            'class_10_score' => $this->schoolScore($student, 'class_10'),
            'class_12_score' => $this->schoolScore($student, 'class_12'),
            'profile_completion' => (float) $this->completeness->for($student)['percent'],
            default => null,
        };
    }

    private function displayValue(string $field, mixed $actual): mixed
    {
        // A batch matches on its code or its graduation year; show the code.
        return $field === 'batch' ? array_slice((array) $actual, 0, 1) : $actual;
    }

    /** Verified class 10 / 12 score as a percentage (a 10-point CGPA is converted × 9.5). */
    private function schoolScore(Student $student, string $level): ?float
    {
        $record = $student->education
            ->where('level', $level)
            ->whereNotNull('verified_at')
            ->sortByDesc('year_of_passing')
            ->first();

        if (! $record || $record->score === null) {
            return null;
        }

        $score = (float) $record->score;

        return strtolower((string) $record->score_type) === 'cgpa' ? round($score * 9.5, 2) : $score;
    }

    private function skillLevel(Student $student, int $skillId): ?int
    {
        $skill = $student->studentSkills->firstWhere('skill_id', $skillId);

        return $skill ? (int) ($skill->verified_level ?? $skill->level) : null;
    }

    private function skillName(int $skillId): string
    {
        return $this->skillNames[$skillId] ??= Skill::query()->whereKey($skillId)->value('name') ?? 'Skill';
    }

    private function float(mixed $value): ?float
    {
        return $value === null || $value === '' ? null : (float) $value;
    }

    private function number(mixed $value): string
    {
        $number = (float) $value;

        return fmod($number, 1.0) === 0.0 ? (string) (int) $number : rtrim(rtrim(number_format($number, 2, '.', ''), '0'), '.');
    }
}
