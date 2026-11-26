<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A payment recorded against a student's fee, with its receipt number. Payments are never
 * deleted: a wrong one is voided (with a reason) and stops counting.
 */
class StudentFeePayment extends Model
{
    use BelongsToInstitution;

    public const METHODS = ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other'];

    protected $fillable = ['student_fee_id', 'receipt_number', 'amount', 'method', 'reference', 'paid_on', 'remarks', 'recorded_by', 'voided_at', 'voided_by', 'void_reason'];

    protected $casts = [
        'amount' => 'float',
        'paid_on' => 'date',
        'voided_at' => 'datetime',
    ];

    public function studentFee(): BelongsTo
    {
        return $this->belongsTo(StudentFee::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
