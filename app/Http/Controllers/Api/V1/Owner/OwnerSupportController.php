<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Rules\PlatformStaffUser;
use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketAttachment;
use App\Models\TicketReply;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Customer support ticket triage, public/internal replies, SLA timers, escalation,
 * verified private attachments, and CSAT capture (SRS §5.16).
 */
class OwnerSupportController extends Controller
{
    private const SLA_HOURS = [
        'urgent' => [1, 4],
        'high' => [4, 24],
        'medium' => [8, 48],
        'low' => [24, 72],
    ];

    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(SupportTicket::STATUSES)],
            'priority' => ['nullable', Rule::in(SupportTicket::PRIORITIES)],
            'category' => ['nullable', Rule::in(SupportTicket::CATEGORIES)],
            'institutionId' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $tickets = SupportTicket::query()
            ->with(['institution:id,code,name', 'assignee:id,name', 'reporter:id,name'])
            ->withCount(['replies', 'attachments'])
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['priority'] ?? null, fn ($q, string $p) => $q->where('priority', $p))
            ->when($filters['category'] ?? null, fn ($q, string $c) => $q->where('category', $c))
            ->when($filters['institutionId'] ?? null, fn ($q, int $id) => $q->where('institution_id', $id))
            ->when($filters['search'] ?? null, fn ($q, string $t) => $q->where(fn ($in) => $in
                ->where('ticket_number', 'like', "%{$t}%")->orWhere('subject', 'like', "%{$t}%")))
            ->latest('id')
            ->get();

        $now = now();

        return response()->json([
            'data' => $tickets->map(fn (SupportTicket $t) => $this->presentTicket($t)),
            'summary' => [
                'open' => $tickets->whereIn('status', ['open', 'in_progress', 'waiting_customer', 'escalated'])->count(),
                'escalated' => $tickets->where('status', 'escalated')->count(),
                'slaBreached' => $tickets->filter(fn (SupportTicket $t) => ! in_array($t->status, ['resolved', 'closed'], true) && $t->resolution_due_at?->lt($now))->count(),
                'avgCsat' => $tickets->whereNotNull('csat_score')->avg('csat_score') ? round((float) $tickets->whereNotNull('csat_score')->avg('csat_score'), 2) : null,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institutionId' => ['nullable', 'integer', 'exists:institutions,id'],
            'subject' => ['required', 'string', 'max:200'],
            'description' => ['required', 'string', 'max:5000'],
            'category' => ['required', Rule::in(SupportTicket::CATEGORIES)],
            'priority' => ['required', Rule::in(SupportTicket::PRIORITIES)],
        ]);

        [$firstHours, $resolveHours] = self::SLA_HOURS[$data['priority']] ?? [8, 48];
        $number = 'TKT-'.now()->format('Ymd').'-'.strtoupper(Str::random(5));

        $ticket = SupportTicket::query()->create([
            'ticket_number' => $number,
            'institution_id' => $data['institutionId'] ?? null,
            'reporter_user_id' => $request->user()->id,
            'assigned_to' => $request->user()->id,
            'subject' => $data['subject'],
            'description' => $data['description'],
            'category' => $data['category'],
            'priority' => $data['priority'],
            'status' => 'open',
            'first_response_due_at' => now()->addHours($firstHours),
            'resolution_due_at' => now()->addHours($resolveHours),
        ]);

        $this->audit->record('owner.ticket_created', $ticket, [], ['ticketNumber' => $ticket->ticket_number, 'priority' => $ticket->priority], $request->user(), $ticket->institution_id);

        return response()->json(['data' => $this->presentTicket($ticket->load(['institution:id,code,name', 'assignee:id,name', 'reporter:id,name']))], 201);
    }

    public function show(SupportTicket $ticket): JsonResponse
    {
        $ticket->load(['institution:id,code,name', 'assignee:id,name', 'reporter:id,name', 'replies.author:id,name', 'attachments.uploader:id,name']);

        return response()->json([
            'data' => [
                ...$this->presentTicket($ticket),
                'description' => $ticket->description,
                'replies' => $ticket->replies->map(fn (TicketReply $r) => [
                    'id' => $r->id,
                    'body' => $r->body,
                    'isInternal' => $r->is_internal,
                    'author' => $r->author?->name ?? 'System',
                    'at' => $r->created_at?->toIso8601String(),
                ])->values(),
                'attachments' => $ticket->attachments->map(fn (TicketAttachment $a) => [
                    'id' => $a->id,
                    'originalName' => $a->original_name,
                    'mimeType' => $a->mime_type,
                    'sizeBytes' => $a->size_bytes,
                    'uploadedBy' => $a->uploader?->name,
                    'at' => $a->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }

    public function update(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(SupportTicket::STATUSES)],
            'priority' => ['sometimes', Rule::in(SupportTicket::PRIORITIES)],
            'assignedTo' => ['nullable', 'integer', new PlatformStaffUser],
            'escalate' => ['sometimes', 'boolean'],
            'csatScore' => ['nullable', 'integer', 'between:1,5'],
            'csatComment' => ['nullable', 'string', 'max:255'],
        ]);

        $before = $ticket->only(['status', 'priority', 'escalation_level']);
        $nextStatus = $data['status'] ?? $ticket->status;
        $escalation = $ticket->escalation_level;
        if ($data['escalate'] ?? false) {
            $nextStatus = 'escalated';
            $escalation++;
        }

        $ticket->forceFill([
            'status' => $nextStatus,
            'priority' => $data['priority'] ?? $ticket->priority,
            ...(array_key_exists('assignedTo', $data) ? ['assigned_to' => $data['assignedTo']] : []),
            'escalation_level' => $escalation,
            ...(array_key_exists('csatScore', $data) ? ['csat_score' => $data['csatScore']] : []),
            ...(array_key_exists('csatComment', $data) ? ['csat_comment' => $data['csatComment']] : []),
            ...(in_array($nextStatus, ['resolved', 'closed'], true) && ! $ticket->resolved_at ? ['resolved_at' => now()] : []),
        ])->save();

        $this->audit->record('owner.ticket_updated', $ticket, $before, $ticket->only(['status', 'priority', 'escalation_level']), $request->user(), $ticket->institution_id);

        return $this->show($ticket->fresh());
    }

    public function reply(Request $request, SupportTicket $ticket): JsonResponse
    {
        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
            'isInternal' => ['sometimes', 'boolean'],
            'attachment' => ['nullable', 'file', 'mimes:png,jpg,jpeg,pdf,txt,log,csv', 'max:5120'],
        ]);

        $isInternal = (bool) ($data['isInternal'] ?? false);
        $reply = TicketReply::query()->create([
            'ticket_id' => $ticket->id,
            'author_id' => $request->user()->id,
            'body' => $data['body'],
            'is_internal' => $isInternal,
        ]);

        if (! $isInternal && ! $ticket->first_responded_at) {
            $ticket->forceFill([
                'first_responded_at' => now(),
                'status' => $ticket->status === 'open' ? 'in_progress' : $ticket->status,
            ])->save();
        }

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $safeName = Str::random(16).'.'.strtolower($file->getClientOriginalExtension() ?: 'bin');
            $diskPath = $file->storeAs("owner/support-attachments/{$ticket->id}", $safeName, 'local');

            TicketAttachment::query()->create([
                'ticket_id' => $ticket->id,
                'reply_id' => $reply->id,
                'uploaded_by' => $request->user()->id,
                'original_name' => basename($file->getClientOriginalName()),
                'disk_path' => $diskPath,
                'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                'size_bytes' => $file->getSize() ?? 0,
            ]);
        }

        $this->audit->record('owner.ticket_replied', $ticket, [], ['isInternal' => $isInternal], $request->user(), $ticket->institution_id);

        return $this->show($ticket->fresh());
    }

    public function downloadAttachment(TicketAttachment $attachment)
    {
        abort_unless(Storage::disk('local')->exists($attachment->disk_path), 404);

        return Storage::disk('local')->download($attachment->disk_path, $attachment->original_name, [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @return array<string, mixed> */
    private function presentTicket(SupportTicket $t): array
    {
        $closed = in_array($t->status, ['resolved', 'closed'], true);

        return [
            'id' => $t->id,
            'ticketNumber' => $t->ticket_number,
            'institution' => $t->institution ? ['id' => $t->institution->id, 'code' => $t->institution->code, 'name' => $t->institution->name] : null,
            'reporter' => $t->reporter?->name,
            'assignee' => $t->assignee ? ['id' => $t->assignee->id, 'name' => $t->assignee->name] : null,
            'subject' => $t->subject,
            'category' => $t->category,
            'priority' => $t->priority,
            'status' => $t->status,
            'escalationLevel' => $t->escalation_level,
            'firstResponseDueAt' => $t->first_response_due_at?->toIso8601String(),
            'firstRespondedAt' => $t->first_responded_at?->toIso8601String(),
            'resolutionDueAt' => $t->resolution_due_at?->toIso8601String(),
            'resolvedAt' => $t->resolved_at?->toIso8601String(),
            'slaBreached' => ! $closed && ($t->resolution_due_at?->isPast() ?? false),
            'csatScore' => $t->csat_score,
            'csatComment' => $t->csat_comment,
            'repliesCount' => $t->replies_count ?? ($t->relationLoaded('replies') ? $t->replies->count() : 0),
            'attachmentsCount' => $t->attachments_count ?? ($t->relationLoaded('attachments') ? $t->attachments->count() : 0),
            'createdAt' => $t->created_at?->toIso8601String(),
        ];
    }
}

