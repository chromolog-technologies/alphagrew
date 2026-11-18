<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DesignationModuleMap extends Model
{
    protected $table = 'designation_module_map';

    protected $fillable = [
        'designation_id',
        'module_id',
        'permissions',
    ];

    protected $casts = [
        'permissions' => 'array',
    ];

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(ModulePermission::class, 'module_id');
    }
}
