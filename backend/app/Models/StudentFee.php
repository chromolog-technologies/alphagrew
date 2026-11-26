<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One student's due for one fee structure. amount_paid and status follow the recorded
 * (non-voided) payments; call refreshTotals() after a payment changes.
 */
class StudentFee extends Model
{
    use BelongsToInstitution, SoftDeletes;

    protected $fillable = ['student_id', 'fee_structure_id', 'amount_due', 'amount_paid', 'status', 'due_date', 'paid_date', 'remarks'];

    protected $casts = [
        'amount_due' => 'float',
        'amount_paid' => 'float',
        'due_date' => 'date',
        'paid_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function feeStructure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(StudentFeePayment::class);
    }

    public function balance(): float
    {
        return round(max(0, $this->amount_due - $this->amount_paid), 2);
    }

    /** pending | partial | paid, plus "overdue" for display when the due date has passed. */
    public function displayStatus(): string
    {
        return $this->balance() > 0 && $this->due_date && $this->due_date->isPast() && ! $this->due_date->isToday()
            ? 'overdue'
            : $this->status;
    }

    /** Recomputes amount_paid / status / paid_date from the payments, and the student's fee_status. */
    public function refreshTotals(): void
    {
        $paid = (float) $this->payments()->whereNull('voided_at')->sum('amount');
        $status = $paid <= 0 ? 'pending' : ($paid + 0.005 >= $this->amount_due ? 'paid' : 'partial');

        $this->update([
            'amount_paid' => round($paid, 2),
            'status' => $status,
            'paid_date' => $status === 'paid' ? ($this->payments()->whereNull('voided_at')->max('paid_on') ?? now()->toDateString()) : null,
        ]);

        // The student record keeps a single paid / pending flag used across the app.
        $open = self::query()->where('student_id', $this->student_id)->where('status', '!=', 'paid')->exists();
        Student::query()->whereKey($this->student_id)->update(['fee_status' => $open ? 'pending' : 'paid']);
    }
}
