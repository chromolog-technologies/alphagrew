<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A physical campus of an institution. One campus is the primary one.
 */
class Campus extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $table = 'campuses';

    protected $fillable = [
        'name',
        'code',
        'address',
        'city',
        'state',
        'phone',
        'is_primary',
    ];

    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
        ];
    }
}
