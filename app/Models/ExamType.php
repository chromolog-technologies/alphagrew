<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamType extends Model
{
    use SoftDeletes;

    protected $table = 'exam_types';

    protected $fillable = [
        'name',
        'code',
        'max_marks',
        'passing_marks',
        'weightage',
    ];

    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class);
    }
}
