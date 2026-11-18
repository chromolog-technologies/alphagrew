<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Private disk attachment metadata linked to a SupportTicket (SRS NFR-SEC-007).
 */
class TicketAttachment extends Model
{
    protected $fillable = [
        'ticket_id',
        'reply_id',
        'uploaded_by',
        'original_name',
        'disk_path',
        'mime_type',
        'size_bytes',
    ];

    protected $hidden = ['disk_path'];

    protected function casts(): array
    {
        return ['size_bytes' => 'integer'];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}

