<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AuditLogs\ListAuditLogsRequest;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Read-only audit log of the caller's institution (the tenant scope applies).
 */
class AuditLogController extends Controller
{
    public function index(ListAuditLogsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();

        $logs = AuditLog::query()
            ->with('actor:id,name')
            ->when($filters['action'] ?? null, fn ($query, string $action) => Str::endsWith($action, '.')
                ? $query->where('action', 'like', $action.'%')
                : $query->where('action', $action))
            ->when($filters['actorId'] ?? null, fn ($query, $actorId) => $query->where('actor_id', $actorId))
            ->when($filters['from'] ?? null, fn ($query, string $from) => $query->where('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when($filters['to'] ?? null, fn ($query, string $to) => $query->where('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->latest('id')
            ->paginate((int) ($filters['per_page'] ?? 50));

        return AuditLogResource::collection($logs);
    }
}
