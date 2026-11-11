<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\LoginHistory;
use App\Models\PlatformSetting;
use App\Models\SecurityEvent;
use App\Models\SystemIncident;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Owner\CollegeLogService;
use App\Services\Owner\SystemHealth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Global settings (SRS FR-GS), the cross-tenant audit log, login history and sessions
 * (FR-SEC-003), and system health (FR-SYS).
 */
class OwnerPlatformController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function settings(): JsonResponse
    {
        return response()->json(['data' => PlatformSetting::values()]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'platformName' => ['sometimes', 'required', 'string', 'max:100'],
            'brandTagline' => ['sometimes', 'nullable', 'string', 'max:180'],
            'brandPrimaryColor' => ['sometimes', 'required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'supportEmail' => ['sometimes', 'nullable', 'email', 'max:255'],
            'supportPhone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'defaultTimezone' => ['sometimes', 'required', 'timezone:all'],
            'defaultLanguage' => ['sometimes', 'required', 'string', 'max:12'],
            'currency' => ['sometimes', 'required', 'string', 'size:3', 'regex:/^[A-Z]{3}$/'],
            'dateFormat' => ['sometimes', 'required', Rule::in(['DD MMM YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])],
            'defaultTrialDays' => ['sometimes', 'required', 'integer', 'between:0,365'],
            'maxUploadMb' => ['sometimes', 'required', 'integer', 'between:1,100'],
            'passwordMinLength' => ['sometimes', 'required', 'integer', 'between:8,64'],
            'sessionTimeoutMinutes' => ['sometimes', 'required', 'integer', 'between:5,1440'],
            'mfaRequiredForPlatformStaff' => ['sometimes', 'required', 'boolean'],
            'billingDefaultTaxCode' => ['sometimes', 'nullable', 'string', 'max:50'],
            'maintenanceEnabled' => ['sometimes', 'required', 'boolean'],
            'maintenanceMessage' => ['sometimes', 'required', 'string', 'max:500'],
            'maintenanceBypassIps' => ['sometimes', 'array', 'max:50'],
            'maintenanceBypassIps.*' => ['ip'],
        ]);

        // Requiring MFA must not lock out the person who turns it on.
        if (($data['mfaRequiredForPlatformStaff'] ?? false) && $request->user()->mfa_enabled_at === null) {
            return response()->json(['message' => 'Set up two-step verification for your own account before requiring it for everyone.', 'errors' => ['mfaRequiredForPlatformStaff' => ['Set up your own two-step verification first.']]], 422);
        }

        $before = array_intersect_key(PlatformSetting::values(), $data);
        PlatformSetting::put($data, $request->user()->id);
        $this->audit->record('owner.settings_updated', null, $before, $data);

        return $this->settings();
    }

    public function auditLogs(Request $request, CollegeLogService $logs): JsonResponse
    {
        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'actorId' => ['nullable', 'integer'],
            'institutionId' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        return response()->json($logs->paginatedAuditLogs($filters));
    }

    public function activityLogs(Request $request, CollegeLogService $logs): JsonResponse
    {
        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:100'],
            'modelType' => ['nullable', 'string', 'max:100'],
            'userId' => ['nullable', 'integer'],
            'institutionId' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        return response()->json($logs->paginatedActivityLogs($filters));
    }

    public function loginHistory(Request $request, CollegeLogService $logs): JsonResponse
    {
        $filters = $request->validate([
            'outcome' => ['nullable', Rule::in(['success', 'failed', 'locked', 'refused', 'mfa_failed'])],
            'institutionId' => ['nullable', 'integer'],
            'email' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        return response()->json($logs->paginatedLoginHistory($filters));
    }

    /** Active API sessions (tokens), platform-wide or per institution. Token values are never returned. */
    public function sessions(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'userId' => ['nullable', 'integer'],
            'institutionId' => ['nullable', 'integer'],
        ]);
        $userId = $filters['userId'] ?? null;
        $institutionId = $filters['institutionId'] ?? null;

        $institutionUserIds = $institutionId !== null
            ? User::query()->withoutGlobalScopes()->where('institution_id', (int) $institutionId)->pluck('id')->all()
            : null;

        if ($institutionUserIds === []) {
            return response()->json(['data' => []]);
        }

        $tokens = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->when($userId, fn ($query, int $id) => $query->where('tokenable_id', $id))
            ->when($institutionUserIds !== null, fn ($query) => $query->whereIn('tokenable_id', $institutionUserIds))
            ->orderByDesc('last_used_at')->orderByDesc('id')
            ->limit(200)
            ->get(['id', 'tokenable_id', 'name', 'last_used_at', 'created_at', 'expires_at']);

        $users = User::query()->withoutGlobalScopes()->whereIn('id', $tokens->pluck('tokenable_id')->unique())->get(['id', 'name', 'email', 'role', 'institution_id'])->keyBy('id');
        $institutions = Institution::query()->whereIn('id', $users->pluck('institution_id')->filter()->unique())->pluck('name', 'id');
        $current = $request->user()->currentAccessToken()?->id;

        return response()->json(['data' => $tokens->map(fn ($token) => [
            'id' => $token->id,
            'device' => $token->name,
            'user' => isset($users[$token->tokenable_id]) ? ['id' => $token->tokenable_id, 'name' => $users[$token->tokenable_id]->name, 'email' => $users[$token->tokenable_id]->email, 'role' => $users[$token->tokenable_id]->role] : null,
            'institution' => isset($users[$token->tokenable_id]) ? ($institutions[$users[$token->tokenable_id]->institution_id] ?? null) : null,
            'lastUsedAt' => $token->last_used_at ? Carbon::parse($token->last_used_at)->toIso8601String() : null,
            'createdAt' => $token->created_at ? Carbon::parse($token->created_at)->toIso8601String() : null,
            'expiresAt' => $token->expires_at ? Carbon::parse($token->expires_at)->toIso8601String() : null,
            'current' => $token->id === $current,
        ])]);
    }

    public function revokeSession(Request $request, int $session): JsonResponse
    {
        $token = DB::table('personal_access_tokens')->where('id', $session)->where('tokenable_type', User::class)->first();
        abort_unless($token, 404);

        DB::table('personal_access_tokens')->where('id', $session)->delete();
        $owner = User::query()->withoutGlobalScopes()->find($token->tokenable_id);
        $this->audit->record('owner.session_revoked', $owner, [], ['session' => $session, 'device' => $token->name], institutionId: $owner?->institution_id);

        return response()->json(['message' => 'Session ended.']);
    }

    public function health(SystemHealth $health): JsonResponse
    {
        return response()->json(['data' => $health->snapshot()]);
    }

    /** GET /owner/security-events (SRS FR-SEC-003) */
    public function securityEvents(Request $request, CollegeLogService $logs): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(SecurityEvent::STATUSES)],
            'severity' => ['nullable', Rule::in(SecurityEvent::SEVERITIES)],
            'institutionId' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        return response()->json($logs->paginatedSecurityEvents($filters));
    }

    /** PATCH /owner/security-events/{securityEvent} */
    public function updateSecurityEvent(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(SecurityEvent::STATUSES)]]);
        $before = ['status' => $securityEvent->status];
        $securityEvent->forceFill([
            'status' => $data['status'],
            'resolved_by' => $data['status'] === 'resolved' ? $request->user()->id : null,
            'resolved_at' => $data['status'] === 'resolved' ? now() : null,
        ])->save();

        $this->audit->record('owner.security_event_updated', $securityEvent, $before, ['status' => $securityEvent->status], $request->user(), $securityEvent->institution_id);

        return response()->json(['data' => ['id' => $securityEvent->id, 'status' => $securityEvent->status]]);
    }

    /** GET /owner/system/incidents (SRS §5.20 FR-SYS-003) */
    public function incidents(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(SystemIncident::STATUSES)],
            'severity' => ['nullable', Rule::in(SystemIncident::SEVERITIES)],
        ]);

        $items = SystemIncident::query()
            ->with(['assignee:id,name', 'creator:id,name'])
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['severity'] ?? null, fn ($q, string $s) => $q->where('severity', $s))
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (SystemIncident $i) => [
                'id' => $i->id,
                'title' => $i->title,
                'severity' => $i->severity,
                'status' => $i->status,
                'component' => $i->component,
                'summary' => $i->summary,
                'impact' => $i->impact,
                'assignee' => $i->assignee ? ['id' => $i->assignee->id, 'name' => $i->assignee->name] : null,
                'creator' => $i->creator?->name,
                'acknowledgedAt' => $i->acknowledged_at?->toIso8601String(),
                'resolvedAt' => $i->resolved_at?->toIso8601String(),
                'resolutionNote' => $i->resolution_note,
                'createdAt' => $i->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $items]);
    }

    /** POST /owner/system/incidents */
    public function storeIncident(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'severity' => ['required', Rule::in(SystemIncident::SEVERITIES)],
            'component' => ['required', Rule::in(SystemIncident::COMPONENTS)],
            'summary' => ['required', 'string', 'max:2000'],
            'impact' => ['nullable', 'string', 'max:255'],
        ]);

        $incident = SystemIncident::query()->create([
            ...$data,
            'status' => 'open',
            'created_by' => $request->user()->id,
        ]);

        $this->audit->record('owner.incident_created', $incident, [], ['title' => $incident->title, 'severity' => $incident->severity], $request->user());

        return response()->json(['data' => ['id' => $incident->id, 'status' => $incident->status]], 201);
    }

    /** PATCH /owner/system/incidents/{incident} */
    public function updateIncident(Request $request, SystemIncident $incident): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(SystemIncident::STATUSES)],
            'severity' => ['sometimes', Rule::in(SystemIncident::SEVERITIES)],
            'assignedTo' => ['nullable', 'integer', 'exists:users,id'],
            'resolutionNote' => ['nullable', 'string', 'max:1000'],
        ]);

        $before = $incident->only(['status', 'severity', 'assigned_to']);
        $nextStatus = $data['status'] ?? $incident->status;
        $incident->forceFill([
            'status' => $nextStatus,
            'severity' => $data['severity'] ?? $incident->severity,
            ...(array_key_exists('assignedTo', $data) ? ['assigned_to' => $data['assignedTo']] : []),
            ...(array_key_exists('resolutionNote', $data) ? ['resolution_note' => $data['resolutionNote']] : []),
            ...($nextStatus === 'investigating' && ! $incident->acknowledged_at ? ['acknowledged_at' => now()] : []),
            ...($nextStatus === 'resolved' ? ['resolved_at' => now()] : []),
        ])->save();

        $this->audit->record('owner.incident_updated', $incident, $before, $incident->only(['status', 'severity', 'assigned_to']), $request->user());

        return response()->json(['data' => ['id' => $incident->id, 'status' => $incident->status]]);
    }
}
