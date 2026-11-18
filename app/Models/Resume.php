<?php

namespace App\Models;

use App\Enums\ResumeStatus;
use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * An uploaded resume file (PDF / DOCX) on the private disk, its extracted text and the
 * structured data parsed from it. One per student is the default.
 */
class Resume extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'student_id',
        'title',
        'file_path',
        'file_name',
        'file_size_bytes',
        'file_hash',
        'mime_type',
        'parsed_text',
        'parsed_data',
        'status',
        'parse_error',
        'is_default',
    ];

    protected $hidden = ['parsed_text'];

    protected function casts(): array
    {
        return [
            'status' => ResumeStatus::class,
            'parsed_data' => 'array',
            'is_default' => 'boolean',
            'file_size_bytes' => 'integer',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function analysis(): HasOne
    {
        return $this->hasOne(AiResumeAnalysis::class);
    }
}
