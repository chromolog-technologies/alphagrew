<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One record of a custom module. Attributes beyond title and status are custom field values.
 *
 * @property int $custom_module_id
 * @property string $title
 * @property string $status
 */
class CustomModuleRecord extends Model
{
    use BelongsToInstitution, SoftDeletes;

    public const STATUSES = ['active', 'archived'];

    protected $fillable = [
        'custom_module_id',
        'title',
        'status',
        'created_by',
        'updated_by',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(CustomModule::class, 'custom_module_id');
    }
}
