<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Support ticket with configurable SLA deadlines, escalation and CSAT (SRS §5.16).
 */
class SupportTicket extends Model
{
    public const CATEGORIES = ['technical', 'billing', 'onboarding', 'ai', 'academic', 'placement', 'security', 'other'];

    public const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public const STATUSES = ['open', 'in_progress', 'waiting_customer', 'escalated', 'resolved', 'closed'];

    protected $fillable = [
        'ticket_number',
        'institution_id',
        'reporter_user_id',
        'assigned_to',
        'subject',
        'description',
        'category',
        'priority',
        'status',
        'first_response_due_at',
        'first_responded_at',
        'resolution_due_at',
        'resolved_at',
        'escalation_level',
        'csat_score',
        'csat_comment',
    ];

    protected function casts(): array
    {
        return [
            'first_response_due_at' => 'datetime',
            'first_responded_at' => 'datetime',
            'resolution_due_at' => 'datetime',
            'resolved_at' => 'datetime',
            'escalation_level' => 'integer',
            'csat_score' => 'integer',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_user_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(TicketReply::class, 'ticket_id')->orderBy('id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class, 'ticket_id')->latest('id');
    }
}

