<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

/**
 * One band of the institution's grading scale: a score percentage range mapped to a
 * letter grade, a 10-point grade point and a pass/fail verdict.
 */
class GradeRule extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    /** Grade given to absent students. Not a score band, so never matched by percentage. */
    public const ABSENT = 'Ab';

    /** Grade given when a component (internal / external / total) is below its pass mark. */
    public const FAIL = 'F';

    protected $fillable = [
        'grade',
        'grade_point',
        'is_pass',
        'min_score',
        'max_score',
        'description',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'grade_point' => 'float',
            'is_pass' => 'boolean',
            'min_score' => 'float',
            'max_score' => 'float',
        ];
    }

    /** The default scale (spec §4 Stage 1), used by POST /grade-rules/setup-defaults. */
    public static function defaults(): array
    {
        return [
            ['grade' => 'O', 'grade_point' => 10, 'min_score' => 90, 'max_score' => 100, 'description' => 'Outstanding', 'is_pass' => true],
            ['grade' => 'A+', 'grade_point' => 9, 'min_score' => 80, 'max_score' => 89.99, 'description' => 'Excellent', 'is_pass' => true],
            ['grade' => 'A', 'grade_point' => 8, 'min_score' => 70, 'max_score' => 79.99, 'description' => 'Very Good', 'is_pass' => true],
            ['grade' => 'B+', 'grade_point' => 7, 'min_score' => 60, 'max_score' => 69.99, 'description' => 'Good', 'is_pass' => true],
            ['grade' => 'B', 'grade_point' => 6, 'min_score' => 55, 'max_score' => 59.99, 'description' => 'Above Average', 'is_pass' => true],
            ['grade' => 'C', 'grade_point' => 5, 'min_score' => 50, 'max_score' => 54.99, 'description' => 'Average', 'is_pass' => true],
            ['grade' => 'P', 'grade_point' => 4, 'min_score' => 40, 'max_score' => 49.99, 'description' => 'Marginal Pass', 'is_pass' => true],
            ['grade' => self::FAIL, 'grade_point' => 0, 'min_score' => 0, 'max_score' => 39.99, 'description' => 'Fail', 'is_pass' => false],
            ['grade' => self::ABSENT, 'grade_point' => 0, 'min_score' => 0, 'max_score' => 0, 'description' => 'Absent', 'is_pass' => false],
        ];
    }
}
