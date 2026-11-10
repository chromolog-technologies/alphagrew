<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One record's value for one custom field. Only the column matching the field type is set
 * (see CustomFieldDefinition::valueColumn()); multiselect values are JSON in value_text.
 */
class CustomFieldValue extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'definition_id',
        'entity',
        'entity_id',
        'value_text',
        'value_number',
        'value_date',
    ];

    protected $casts = [
        'value_number' => 'float',
        'value_date' => 'date:Y-m-d',
    ];

    public function definition(): BelongsTo
    {
        return $this->belongsTo(CustomFieldDefinition::class, 'definition_id');
    }
}
