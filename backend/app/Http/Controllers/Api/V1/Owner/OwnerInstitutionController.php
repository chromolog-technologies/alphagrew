<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Institution;
use App\Models\InstitutionStatusEvent;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Owner\InstitutionLifecycle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Institution directory and lifecycle for the owner console (SRS FR-IN-001..008, §8.1).
 * Platform-wide; owner requests bypass tenant scoping.
 */
class OwnerInstitutionController extends Controller
{
    private const SORTS = ['name', 'created_at', 'status', 'code'];

    public function __construct(private readonly AuditLogger $audit, private readonly InstitutionLifecycle $lifecycle)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $page = $this->filtered($request)->paginate($request->integer('perPage', 25) ?: 25);

        return response()->json([
            'data' => collect($page->items())->map(fn (Institution $institution) => $this->summary($institution)),
            'meta' => ['currentPage' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total(), 'perPage' => $page->perPage()],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = $this->filtered($request)->get();
        $this->audit->record('owner.institutions_exported', null, [], ['filters' => $request->only(['search', 'status', 'verification', 'sort']), 'rows' => $rows->count()]);

        return response()->streamDownload(function () use ($rows): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Code', 'Name', 'Type', 'Status', 'Verification', 'Official email', 'Phone', 'State', 'Students', 'Users', 'Created']);
            foreach ($rows as $institution) {
                fputcsv($out, [
                    $institution->code, $institution->name, $institution->institution_type, $institution->status, $institution->verification_status,
                    $institution->official_email, $institution->contact_phone, $institution->state, $institution->students_count, $institution->users_count,
                    $institution->created_at?->toDateString(),
                ]);
            }
            fclose($out);
        }, 'institutions-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    public function store(Request $request): JsonResponse
    {
        // Codes are stored upper-case; compare them that way so "abc" and "ABC" collide.
        if (is_string($request->input('code'))) {
            $request->merge(['code' => strtoupper(trim($request->input('code')))]);
        }

        $data = $request->validate([
            ...$this->profileRules(),
            'code' => ['required', 'string', 'max:30', 'regex:/^[A-Za-z0-9_-]+$/', Rule::unique('institutions', 'code')],
            'status' => ['required', Rule::in(['prospect', 'trial', 'active'])],
            'trialDays' => ['nullable', 'integer', 'between:1,365'],
            'adminName' => ['required', 'string', 'max:255'],
            'adminEmail' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
        ]);

        $institution = DB::transaction(function () use ($data, $request): Institution {
            $institution = Institution::query()->create([
                ...$this->profileAttributes($data),
                'code' => strtoupper($data['code']),
                'slug' => $this->uniqueSlug($data['name']),
                'status' => $data['status'],
                'verification_status' => 'pending',
                'trial_ends_at' => $data['status'] === 'trial' ? now()->addDays($data['trialDays'] ?? (int) PlatformSetting::get('defaultTrialDays'))->endOfDay() : null,
            ]);

            $institution->statusEvents()->create([
                'kind' => 'lifecycle', 'from_status' => null, 'to_status' => $data['status'], 'reason' => 'Created',
                'effective_at' => now(), 'applied' => true, 'actor_id' => $request->user()->id,
            ]);

            // The first admin sets their own password from the emailed link.
            $admin = new User(['name' => $data['adminName'], 'email' => $data['adminEmail'], 'password' => Str::random(40), 'role' => UserRole::InstitutionAdmin->value, 'title' => 'Institution Administrator']);
            $admin->institution_id = $institution->id;
            $admin->save();

            return $institution;
        });

        Password::broker()->sendResetLink(['email' => $data['adminEmail']]);
        $this->audit->record('owner.institution_created', $institution, [], [...$institution->only(['code', 'name', 'status']), 'admin' => $data['adminEmail']]);

        return response()->json(['data' => $this->detail($institution->fresh())], 201);
    }

    public function show(Institution $institution): JsonResponse
    {
        return response()->json(['data' => $this->detail($institution)]);
    }

    public function update(Request $request, Institution $institution): JsonResponse
    {
        $data = $request->validate($this->profileRules(partial: true));
        $attributes = $this->profileAttributes($data);
        $before = $institution->only(array_keys($attributes));
        $institution->update($attributes);
        $this->audit->record('owner.institution_updated', $institution, $before, $institution->only(array_keys($attributes)));

        return response()->json(['data' => $this->detail($institution->fresh())]);
    }

    /** POST /owner/institutions/{institution}/verify {status, note} */
    public function verify(Request $request, Institution $institution): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'string'], 'note' => ['nullable', 'string', 'max:500']]);
        $this->lifecycle->verify($institution, $data['status'], $request->user(), $data['note'] ?? null);

        return response()->json(['data' => $this->detail($institution->fresh())]);
    }

    /** POST /owner/institutions/{institution}/status {status, reason, effectiveAt?} */
    public function changeStatus(Request $request, Institution $institution): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(Institution::STATUSES)],
            'reason' => ['nullable', 'string', 'max:500'],
            'effectiveAt' => ['nullable', 'date'],
        ]);
        $event = $this->lifecycle->change($institution, $data['status'], $request->user(), $data['reason'] ?? null, isset($data['effectiveAt']) ? Carbon::parse($data['effectiveAt']) : null);

        return response()->json(['data' => $this->detail($institution->fresh()), 'scheduled' => ! $event->applied]);
    }

    public function history(Institution $institution): JsonResponse
    {
        $events = $institution->statusEvents()->with('actor:id,name')->get();
        $audit = AuditLog::query()->withoutGlobalScopes()->with('actor:id,name')
            ->where(fn ($query) => $query->where('institution_id', $institution->id)
                ->orWhere(fn ($subject) => $subject->where('subject_type', Institution::class)->where('subject_id', $institution->id)))
            ->latest('created_at')->latest('id')->limit(50)->get();

        return response()->json(['data' => [
            'status' => $events->map(fn (InstitutionStatusEvent $event) => [
                'id' => $event->id, 'kind' => $event->kind, 'from' => $event->from_status, 'to' => $event->to_status, 'reason' => $event->reason,
                'effectiveAt' => $event->effective_at?->toIso8601String(), 'applied' => $event->applied, 'actor' => $event->actor?->name,
                'at' => $event->created_at?->toIso8601String(),
            ]),
            'audit' => $audit->map(fn (AuditLog $log) => [
                'id' => $log->id, 'action' => $log->action, 'actor' => $log->actor?->name, 'old' => $log->old_values, 'new' => $log->new_values,
                'ip' => $log->ip_address, 'at' => $log->created_at?->toIso8601String(),
            ]),
        ]]);
    }

    private function filtered(Request $request)
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(Institution::STATUSES)],
            'verification' => ['nullable', Rule::in(Institution::VERIFICATION_STATUSES)],
            'sort' => ['nullable', Rule::in(self::SORTS)],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'perPage' => ['nullable', 'integer', 'between:1,100'],
        ]);

        return Institution::query()
            ->withCount(['users' => fn ($query) => $query->withoutGlobalScopes()])
            ->withCount(['students' => fn ($query) => $query->withoutGlobalScopes()])
            ->when($filters['search'] ?? null, fn ($query, string $term) => $query->where(fn ($inner) => $inner
                ->where('name', 'like', "%{$term}%")->orWhere('code', 'like', "%{$term}%")->orWhere('official_email', 'like', "%{$term}%")))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['verification'] ?? null, fn ($query, string $status) => $query->where('verification_status', $status))
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? (($filters['sort'] ?? null) === 'name' ? 'asc' : 'desc'));
    }

    /** @return array<string, mixed> */
    private function profileRules(bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'max:200'],
            'institutionType' => [$required, Rule::in(Institution::TYPES)],
            'registrationNumber' => ['nullable', 'string', 'max:100'],
            'officialEmail' => [$required, 'email', 'max:255'],
            'contactPhone' => [$required, 'string', 'max:30', 'regex:/^\+?[0-9 ()-]{7,30}$/'],
            'website' => ['nullable', 'url:https,http', 'max:255'],
            'country' => [$required, 'string', 'max:80'],
            'state' => [$required, 'string', 'max:80'],
            'district' => ['nullable', 'string', 'max:80'],
            'address' => [$required, 'string', 'max:500'],
            'pincode' => ['nullable', 'string', 'max:12', 'regex:/^[A-Za-z0-9 -]{3,12}$/'],
        ];
    }

    /** @param array<string, mixed> $data */
    private function profileAttributes(array $data): array
    {
        $map = [
            'name' => 'name', 'institutionType' => 'institution_type', 'registrationNumber' => 'registration_number', 'officialEmail' => 'official_email',
            'contactPhone' => 'contact_phone', 'website' => 'website', 'country' => 'country', 'state' => 'state', 'district' => 'district',
            'address' => 'address', 'pincode' => 'pincode',
        ];

        $attributes = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data)) {
                $attributes[$column] = is_string($data[$input]) ? trim($data[$input]) : $data[$input];
            }
        }

        return $attributes;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'institution';
        $slug = $base;
        $i = 2;
        while (Institution::query()->withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    /** @return array<string, mixed> */
    private function summary(Institution $institution): array
    {
        return [
            'id' => $institution->id,
            'code' => $institution->code,
            'name' => $institution->name,
            'type' => $institution->institution_type,
            'status' => $institution->status,
            'verificationStatus' => $institution->verification_status,
            'officialEmail' => $institution->official_email,
            'state' => $institution->state,
            'trialEndsAt' => $institution->trial_ends_at?->toIso8601String(),
            'usersCount' => $institution->users_count ?? null,
            'studentsCount' => $institution->students_count ?? null,
            'createdAt' => $institution->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function detail(Institution $institution): array
    {
        $count = fn (string $table) => DB::table($table)->where('institution_id', $institution->id)->when(
            DB::getSchemaBuilder()->hasColumn($table, 'deleted_at'), fn ($query) => $query->whereNull('deleted_at'),
        )->count();
        $users = User::query()->withoutGlobalScopes()->where('institution_id', $institution->id)->whereNull('deleted_at');
        $ai = DB::table('ai_usage_logs')->where('institution_id', $institution->id)->where('created_at', '>=', now()->subDays(30))
            ->selectRaw('count(*) as calls, coalesce(sum(estimated_cost_usd), 0) as cost')->first();
        $pending = $institution->statusEvents()->where('applied', false)->first();
        $subscription = $institution->currentSubscription()->with('plan:id,code,name')->first();
        $wallet = $institution->aiCreditWallet;

        return [
            ...$this->summary($institution),
            'registrationNumber' => $institution->registration_number,
            'contactPhone' => $institution->contact_phone,
            'website' => $institution->website,
            'country' => $institution->country,
            'district' => $institution->district,
            'address' => $institution->address,
            'pincode' => $institution->pincode,
            'suspendedAt' => $institution->suspended_at?->toIso8601String(),
            'suspensionReason' => $institution->suspension_reason,
            'allowedTransitions' => InstitutionLifecycle::allowedFrom($institution->status),
            'scheduledChange' => $pending ? ['to' => $pending->to_status, 'effectiveAt' => $pending->effective_at?->toIso8601String(), 'reason' => $pending->reason] : null,
            'counts' => [
                'campuses' => $count('campuses'),
                'departments' => $count('departments'),
                'students' => $count('students'),
                'staff' => (clone $users)->whereIn('role', [UserRole::Staff->value, UserRole::PlacementOfficer->value])->count(),
                'admins' => (clone $users)->where('role', UserRole::InstitutionAdmin->value)->count(),
                'users' => (clone $users)->count(),
            ],
            'admins' => (clone $users)->where('role', UserRole::InstitutionAdmin->value)->get(['id', 'name', 'email', 'status', 'last_login_at'])
                ->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email, 'status' => $user->status ?? 'active', 'lastLoginAt' => $user->last_login_at?->toIso8601String()]),
            'aiUsage30d' => ['calls' => (int) ($ai->calls ?? 0), 'estimatedCostUsd' => round((float) ($ai->cost ?? 0), 2)],
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'planCode' => $subscription->plan?->code,
                'planName' => $subscription->plan?->name,
                'status' => $subscription->status,
                'billingCycle' => $subscription->billing_cycle,
                'amount' => $subscription->amount,
                'currency' => $subscription->currency,
                'renewalAt' => $subscription->renewal_at?->toIso8601String(),
            ] : null,
            'aiCreditWallet' => $wallet ? [
                'balance' => $wallet->balance,
                'allocatedTotal' => $wallet->allocated_total,
                'consumedTotal' => $wallet->consumed_total,
            ] : null,
        ];
    }
}
