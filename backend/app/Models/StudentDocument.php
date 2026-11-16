<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A document a student uploaded, waiting for or past staff review.
 *
 * @property string $status pending | verified | rejected
 */
class StudentDocument extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const TYPES = ['id_proof', 'mark_sheet', 'certificate', 'transfer_certificate', 'photo', 'other'];

    public const DISK = 'local';

    protected $fillable = [
        'student_id', 'type', 'title', 'file_path', 'original_name', 'mime_type', 'size_bytes',
        'status', 'reviewed_by', 'reviewed_at', 'review_remarks',
    ];

    protected $casts = ['reviewed_at' => 'datetime', 'size_bytes' => 'integer'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
