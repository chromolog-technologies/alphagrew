<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModulePermission extends Model
{
    protected $table = 'module_permissions';

    protected $fillable = [
        'module_name',
    ];

    public function designationMaps(): HasMany
    {
        return $this->hasMany(DesignationModuleMap::class, 'module_id');
    }
}
