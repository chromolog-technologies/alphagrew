<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StudentCertification extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = [
        'student_id',
        'name',
        'issuer',
        'issued_on',
        'expires_on',
        'credential_url',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'issued_on' => 'date',
            'expires_on' => 'date',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
