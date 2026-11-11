<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Configurable tax/GST profile for invoices (SRS FR-BL-006).
 */
class TaxProfile extends Model
{
    public const TYPES = ['gst', 'vat', 'sales_tax', 'none'];

    protected $fillable = [
        'code',
        'name',
        'tax_type',
        'rate_percent',
        'gstin',
        'place_of_supply',
        'is_default',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'rate_percent' => 'float',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}

