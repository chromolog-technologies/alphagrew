<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'name',
        'role',
        'package_offered',
        'drive_date',
        'status',
        'location',
        'type',
        'applicants',
        'shortlisted',
        'eligible_departments',
    ];

    protected function casts(): array
    {
        return [
            'drive_date' => 'date',
            'applicants' => 'integer',
            'shortlisted' => 'integer',
            'eligible_departments' => 'array',
        ];
    }

    public function applications(): HasMany
    {
        return $this->hasMany(CompanyApplication::class);
    }
}
