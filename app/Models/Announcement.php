<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'title',
        'summary',
        'audience',
        'priority',
        'posted_by',
        'date',
        'category',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }
}
