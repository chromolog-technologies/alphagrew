<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/** A file or link faculty share with the students of a subject. */
class CourseMaterial extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = ['subject_id', 'uploaded_by', 'title', 'description', 'link_url', 'file_path', 'original_name', 'mime_type', 'size_bytes'];

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
