<?php

namespace App\Services\Academics;

use App\Exceptions\BusinessRuleException;
use App\Models\GradeRule;
use App\Models\MarkEntry;
use Illuminate\Support\Collection;

/**
 * Derives a mark entry's total, grade, grade point and PASS/FAIL (spec §4 Stage 2):
 *
 * - total = internal + external + extra; percentage against the scheme's total_max
 * - grade and grade point from the institution's grade rules
 * - internal, external or total below its pass mark → F, whatever the percentage
 * - absent → Ab, grade point 0, FAIL
 *
 * One instance caches the grade rules, so reuse it when grading a whole class.
 * Runs inside the tenant context (grade rules are per institution).
 */
class MarkGrader
{
    /** @var Collection<int, GradeRule>|null */
    private ?Collection $rules = null;

    public function apply(MarkEntry $entry): void
    {
        $scheme = $entry->markScheme
            ?? throw BusinessRuleException::unprocessable('A mark scheme is required to grade marks.');

        $internal = (float) $entry->internal_marks;
        $external = (float) $entry->external_marks;
        $total = round($internal + $external + (float) $entry->extra_marks, 2);
        $entry->total_marks = $total;

        if ($entry->is_absent) {
            $this->assign($entry, GradeRule::ABSENT, $this->rule(GradeRule::ABSENT)?->grade_point ?? 0.0, false);

            return;
        }

        $percentage = $scheme->total_max > 0 ? min(100.0, round($total / $scheme->total_max * 100, 2)) : 0.0;
        $band = $this->rules()
            ->first(fn (GradeRule $rule) => $rule->grade !== GradeRule::ABSENT && $percentage >= $rule->min_score && $percentage <= $rule->max_score)
            ?? throw BusinessRuleException::unprocessable("No grade rule covers a score of {$percentage}%. Complete the grade rules first.");

        $belowPassMark = $internal < $scheme->internal_pass
            || $external < $scheme->external_pass
            || $total < $scheme->total_pass;

        if ($belowPassMark && $band->is_pass) {
            $this->assign($entry, GradeRule::FAIL, $this->rule(GradeRule::FAIL)?->grade_point ?? 0.0, false);

            return;
        }

        $this->assign($entry, $band->grade, $band->grade_point, $band->is_pass && ! $belowPassMark);
    }

    private function assign(MarkEntry $entry, string $grade, float $gradePoint, bool $passed): void
    {
        $entry->grade = $grade;
        $entry->grade_point = $passed ? $gradePoint : 0.0;
        $entry->result = $passed ? MarkEntry::RESULT_PASS : MarkEntry::RESULT_FAIL;
    }

    private function rule(string $grade): ?GradeRule
    {
        return $this->rules()->firstWhere('grade', $grade);
    }

    /** @return Collection<int, GradeRule> highest band first */
    private function rules(): Collection
    {
        $this->rules ??= GradeRule::query()->orderByDesc('min_score')->get();

        if ($this->rules->isEmpty()) {
            throw BusinessRuleException::unprocessable('Grade rules are not configured for this institution.');
        }

        return $this->rules;
    }
}
