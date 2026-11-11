<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Models\BackupRecord;
use App\Models\DataRequest;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Backup history, restore verification drills, and tenant data export / deletion
 * governance approvals (SRS §5.23).
 */
class OwnerDataController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function backups(): JsonResponse
    {
        $items = BackupRecord::query()->with(['institution:id,code,name', 'triggerUser:id,name'])->latest('id')->get();
        $overdue = ! $items->where('status', 'completed')->where('created_at', '>=', now()->subDay())->count();

        return response()->json([
            'data' => $items->map(fn (BackupRecord $b) => $this->presentBackup($b)),
            'alerts' => [
                'backupOverdue24h' => $overdue,
                'unverifiedRestores' => $items->where('status', 'completed')->where('verified', false)->count(),
            ],
        ]);
    }

    public function triggerBackup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'backupType' => ['required', Rule::in(BackupRecord::TYPES)],
            'scope' => ['required', Rule::in(BackupRecord::SCOPES)],
            'institutionId' => ['nullable', 'required_if:scope,institution', 'integer', 'exists:institutions,id'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $scopeTag = $data['scope'] === 'institution' ? "inst-{$data['institutionId']}" : 'platform';
        $record = BackupRecord::query()->create([
            'backup_type' => $data['backupType'],
            'scope' => $data['scope'],
            'institution_id' => $data['scope'] === 'institution' ? $data['institutionId'] : null,
            'storage_location' => "s3://alphagrew-backups/{$scopeTag}/".now()->format('Ymd-His')."-{$data['backupType']}.sql.gz",
            'size_mb' => $data['backupType'] === 'full' ? 148.4 : ($data['backupType'] === 'config' ? 2.1 : 18.6),
            'status' => 'completed',
            'verified' => false,
            'retention_until' => now()->addDays(90)->toDateString(),
            'notes' => $data['notes'] ?? null,
            'triggered_by' => $request->user()->id,
        ]);

        $this->audit->record('owner.backup_triggered', $record, [], ['type' => $record->backup_type, 'scope' => $record->scope], $request->user(), $record->institution_id);

        return response()->json(['data' => $this->presentBackup($record->load(['institution:id,code,name', 'triggerUser:id,name']))], 201);
    }

    public function verifyRestore(Request $request, BackupRecord $backup): JsonResponse
    {
        $data = $request->validate([
            'outcome' => ['required', Rule::in(['passed', 'failed'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $backup->forceFill([
            'verified' => $data['outcome'] === 'passed',
            'restore_tested_at' => now(),
            'restore_outcome' => $data['outcome'],
            'notes' => $data['notes'] ?? $backup->notes,
        ])->save();

        $this->audit->record('owner.backup_restore_tested', $backup, [], ['outcome' => $data['outcome']], $request->user(), $backup->institution_id);

        return response()->json(['data' => $this->presentBackup($backup->load(['institution:id,code,name', 'triggerUser:id,name']))]);
    }

    public function requests(): JsonResponse
    {
        $items = DataRequest::query()->with(['institution:id,code,name', 'requester:id,name', 'reviewer:id,name'])->latest('id')->get();

        return response()->json(['data' => $items->map(fn (DataRequest $r) => $this->presentDataRequest($r))]);
    }

    public function storeRequest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institutionId' => ['required', 'integer', 'exists:institutions,id'],
            'requestType' => ['required', Rule::in(DataRequest::TYPES)],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $req = DataRequest::query()->create([
            'institution_id' => $data['institutionId'],
            'request_type' => $data['requestType'],
            'status' => 'pending',
            'reason' => $data['reason'],
            'requested_by' => $request->user()->id,
        ]);

        $this->audit->record('owner.data_request_created', $req, [], ['type' => $req->request_type], $request->user(), $req->institution_id);

        return response()->json(['data' => $this->presentDataRequest($req->load(['institution:id,code,name', 'requester:id,name', 'reviewer:id,name']))], 201);
    }

    public function reviewRequest(Request $request, DataRequest $dataRequest): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected', 'completed'])],
            'confirmation' => ['nullable', 'string', 'max:120'],
        ]);

        if ($dataRequest->request_type === 'deletion' && in_array($data['status'], ['approved', 'completed'], true)) {
            $code = $dataRequest->institution?->code;
            $expected = "DELETE {$code}";
            if (trim((string) ($data['confirmation'] ?? '')) !== $expected) {
                throw BusinessRuleException::unprocessable("Type exact confirmation \"{$expected}\" to approve tenant deletion.");
            }
        }

        $before = ['status' => $dataRequest->status];
        $dataRequest->forceFill([
            'status' => $data['status'],
            'approval_confirmation' => $data['confirmation'] ?? $dataRequest->approval_confirmation,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            ...($data['status'] === 'completed' ? ['completed_at' => now()] : []),
        ])->save();

        $this->audit->record('owner.data_request_reviewed', $dataRequest, $before, ['status' => $data['status']], $request->user(), $dataRequest->institution_id);

        return response()->json(['data' => $this->presentDataRequest($dataRequest->load(['institution:id,code,name', 'requester:id,name', 'reviewer:id,name']))]);
    }

    /** @return array<string, mixed> */
    private function presentBackup(BackupRecord $b): array
    {
        return [
            'id' => $b->id,
            'backupType' => $b->backup_type,
            'scope' => $b->scope,
            'institution' => $b->institution ? ['id' => $b->institution->id, 'code' => $b->institution->code, 'name' => $b->institution->name] : null,
            'storageLocation' => $b->storage_location,
            'sizeMb' => $b->size_mb,
            'status' => $b->status,
            'verified' => $b->verified,
            'restoreTestedAt' => $b->restore_tested_at?->toIso8601String(),
            'restoreOutcome' => $b->restore_outcome,
            'retentionUntil' => $b->retention_until?->toDateString(),
            'notes' => $b->notes,
            'triggeredBy' => $b->triggerUser?->name,
            'createdAt' => $b->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentDataRequest(DataRequest $r): array
    {
        return [
            'id' => $r->id,
            'institution' => $r->institution ? ['id' => $r->institution->id, 'code' => $r->institution->code, 'name' => $r->institution->name] : null,
            'requestType' => $r->request_type,
            'status' => $r->status,
            'reason' => $r->reason,
            'requestedBy' => $r->requester?->name,
            'reviewedBy' => $r->reviewer?->name,
            'reviewedAt' => $r->reviewed_at?->toIso8601String(),
            'completedAt' => $r->completed_at?->toIso8601String(),
            'createdAt' => $r->created_at?->toIso8601String(),
        ];
    }
}

