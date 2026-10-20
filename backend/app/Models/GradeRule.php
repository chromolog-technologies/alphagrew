<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class GradeRule extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    protected $fillable = [
        'min_score',
        'max_score',
        'grade',
        'gpa',
        'description',
        'sort_order',
    ];

    protected $casts = [
        'gpa' => 'decimal:2',
    ];

    /**
     * Get grade for a given score
     */
    public static function getGradeForScore($score): ?string
    {
        return self::where('min_score', '<=', $score)
            ->where('max_score', '>=', $score)
            ->value('grade');
    }

    /**
     * Get GPA for a given score
     */
    public static function getGpaForScore($score): float
    {
        return self::where('min_score', '<=', $score)
            ->where('max_score', '>=', $score)
            ->value('gpa') ?? 0;
    }

    /**
     * Get all grade rules sorted
     */
    public static function getAllSorted()
    {
        return self::orderBy('sort_order')
            ->orderByDesc('min_score')
            ->get();
    }
}
