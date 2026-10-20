<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class SemesterResult extends Model
{
    use BelongsToInstitution, SoftDeletes, LogsActivity;

    protected $fillable = [
        'student_id',
        'semester_id',
        'total_subjects',
        'subjects_passed',
        'subjects_failed',
        'total_marks',
        'total_possible_marks',
        'percentage',
        'overall_grade',
        'gpa',
        'result',
        'is_published',
        'published_at',
        'locked_at',
        'published_by',
        'remarks',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'locked_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by');
    }

    public function markEntries(): HasMany
    {
        return $this->hasMany(MarkEntry::class, 'student_id', 'student_id')
            ->whereHas('subject', function ($q) {
                $q->whereHas('semesters', function ($q) {
                    $q->where('semesters.id', $this->semester_id);
                });
            });
    }

    /**
     * Calculate semester result from mark entries
     */
    public function recalculateResult(): void
    {
        $markEntries = MarkEntry::where('student_id', $this->student_id)
            ->whereHas('subject', function ($q) {
                $q->whereHas('semesters', function ($q) {
                    $q->where('semesters.id', $this->semester_id);
                });
            })
            ->where('status', '!=', 'draft')
            ->get();

        if ($markEntries->isEmpty()) {
            $this->result = 'PENDING';
            $this->total_subjects = 0;
            $this->subjects_passed = 0;
            $this->subjects_failed = 0;
            $this->total_marks = 0;
            $this->total_possible_marks = 0;
            $this->percentage = 0;
            $this->overall_grade = null;
            $this->gpa = 0;
            return;
        }

        $this->total_subjects = $markEntries->count();
        $this->subjects_passed = $markEntries->where('result', 'PASS')->count();
        $this->subjects_failed = $markEntries->where('result', 'FAIL')->count();
        $this->total_marks = $markEntries->sum('total_marks');
        $this->total_possible_marks = $markEntries->sum(function ($entry) {
            return $entry->markScheme->total_marks ?? 100;
        });
        $this->percentage = $this->total_possible_marks > 0
            ? round(($this->total_marks / $this->total_possible_marks) * 100, 2)
            : 0;

        // Calculate overall grade based on percentage
        $this->overall_grade = GradeRule::getGradeForScore($this->percentage);

        // Calculate GPA
        $gpaValues = $markEntries->map(function ($entry) {
            return GradeRule::getGpaForScore($entry->total_marks);
        })->toArray();
        $this->gpa = count($gpaValues) > 0 ? round(array_sum($gpaValues) / count($gpaValues), 2) : 0;

        // Result: PASS only if all subjects pass
        $this->result = $this->subjects_failed > 0 ? 'FAIL' : 'PASS';
    }

    /**
     * Is this result locked?
     */
    public function isLocked(): bool
    {
        return $this->is_published && $this->locked_at !== null;
    }

    /**
     * Publish result and lock it
     */
    public function publishAndLock($userId): void
    {
        $this->is_published = true;
        $this->published_at = now();
        $this->published_by = $userId;
        $this->locked_at = now();
        $this->save();

        // Lock all mark entries for this semester
        MarkEntry::where('student_id', $this->student_id)
            ->whereHas('subject', function ($q) {
                $q->whereHas('semesters', function ($q) {
                    $q->where('semesters.id', $this->semester_id);
                });
            })
            ->update(['status' => 'locked']);
    }
}
