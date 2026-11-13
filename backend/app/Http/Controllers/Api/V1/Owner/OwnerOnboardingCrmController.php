<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Rules\PlatformStaffUser;
use App\Enums\UserRole;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Models\Institution;
use App\Models\InstitutionStatusEvent;
use App\Models\Lead;
use App\Models\OnboardingChecklist;
use App\Models\OnboardingRequest;
use App\Models\SalesActivity;
use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Sales CRM leads & follow-ups (SRS §5.17) and the 9-stage Institution Onboarding Pipeline (§5.3).
 */
class OwnerOnboardingCrmController extends Controller
{
    private const DEFAULT_CHECKLIST = [
        ['new', 'Verify official domain and registration documents'],
        ['demo', 'Conduct product walkthrough & capture stakeholder feedback'],
        ['agreement', 'Confirm subscription terms & tax billing profile'],
        ['configuration', 'Set institution timezone, academic years and placements setup'],
        ['training', 'Onboard Institution Admin & placement team'],
    ];

    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function leads(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'stage' => ['nullable', Rule::in(Lead::STAGES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $items = Lead::query()
            ->with(['owner:id,name', 'interestedPlan:id,code,name'])
            ->withCount('activities')
            ->when($filters['stage'] ?? null, fn ($q, string $s) => $q->where('stage', $s))
            ->when($filters['search'] ?? null, fn ($q, string $term) => $q->where(fn ($in) => $in
                ->where('organization_name', 'like', "%{$term}%")
                ->orWhere('contact_name', 'like', "%{$term}%")
                ->orWhere('contact_email', 'like', "%{$term}%")))
            ->latest('id')
            ->get();

        return response()->json(['data' => $items->map(fn (Lead $l) => $this->presentLead($l))]);
    }

    public function storeLead(Request $request): JsonResponse
    {
        $data = $request->validate([
            'organizationName' => ['required', 'string', 'max:180'],
            'contactName' => ['required', 'string', 'max:120'],
            'contactEmail' => ['required', 'email', 'max:160'],
            'contactPhone' => ['nullable', 'string', 'max:40'],
            'source' => ['sometimes', Rule::in(Lead::SOURCES)],
            'interestedPlanId' => ['nullable', 'integer', 'exists:plans,id'],
            'expectedStudents' => ['nullable', 'integer', 'min:1'],
            'expectedMrr' => ['nullable', 'numeric', 'min:0'],
            'nextFollowUpAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $lead = Lead::query()->create([
            'organization_name' => $data['organizationName'],
            'contact_name' => $data['contactName'],
            'contact_email' => strtolower($data['contactEmail']),
            'contact_phone' => $data['contactPhone'] ?? null,
            'source' => $data['source'] ?? 'website',
            'stage' => 'new',
            'owner_id' => $request->user()->id,
            'interested_plan_id' => $data['interestedPlanId'] ?? null,
            'expected_students' => $data['expectedStudents'] ?? null,
            'expected_mrr' => $data['expectedMrr'] ?? null,
            'next_follow_up_at' => $data['nextFollowUpAt'] ?? now()->addDays(2),
            'notes' => $data['notes'] ?? null,
        ]);

        $this->audit->record('owner.lead_created', $lead, [], ['organization' => $lead->organization_name], $request->user());

        return response()->json(['data' => $this->presentLead($lead->load(['owner:id,name', 'interestedPlan:id,code,name']))], 201);
    }

    public function showLead(Lead $lead): JsonResponse
    {
        $lead->load(['owner:id,name', 'interestedPlan:id,code,name', 'activities.actor:id,name']);

        return response()->json(['data' => [
            ...$this->presentLead($lead),
            'activities' => $lead->activities->map(fn (SalesActivity $a) => [
                'id' => $a->id,
                'activityType' => $a->activity_type,
                'summary' => $a->summary,
                'outcome' => $a->outcome,
                'occurredAt' => $a->occurred_at?->toIso8601String(),
                'actor' => $a->actor?->name,
            ])->values(),
        ]]);
    }

    public function updateLead(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'stage' => ['sometimes', Rule::in(Lead::STAGES)],
            'ownerId' => ['nullable', 'integer', new PlatformStaffUser],
            'interestedPlanId' => ['nullable', 'integer', 'exists:plans,id'],
            'expectedStudents' => ['nullable', 'integer', 'min:1'],
            'expectedMrr' => ['nullable', 'numeric', 'min:0'],
            'nextFollowUpAt' => ['nullable', 'date'],
            'demoOutcome' => ['nullable', 'string', 'max:255'],
            'lostReason' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if (($data['stage'] ?? null) === 'lost' && empty($data['lostReason'] ?? $lead->lost_reason)) {
            throw BusinessRuleException::unprocessable('Provide a lost reason when marking a lead as lost.');
        }

        $before = $lead->only(['stage', 'owner_id']);
        $lead->update([
            ...(isset($data['stage']) ? ['stage' => $data['stage']] : []),
            ...(array_key_exists('ownerId', $data) ? ['owner_id' => $data['ownerId']] : []),
            ...(array_key_exists('interestedPlanId', $data) ? ['interested_plan_id' => $data['interestedPlanId']] : []),
            ...(array_key_exists('expectedStudents', $data) ? ['expected_students' => $data['expectedStudents']] : []),
            ...(array_key_exists('expectedMrr', $data) ? ['expected_mrr' => $data['expectedMrr']] : []),
            ...(array_key_exists('nextFollowUpAt', $data) ? ['next_follow_up_at' => $data['nextFollowUpAt']] : []),
            ...(array_key_exists('demoOutcome', $data) ? ['demo_outcome' => $data['demoOutcome']] : []),
            ...(array_key_exists('lostReason', $data) ? ['lost_reason' => $data['lostReason']] : []),
            ...(array_key_exists('notes', $data) ? ['notes' => $data['notes']] : []),
        ]);

        $this->audit->record('owner.lead_updated', $lead, $before, $lead->only(['stage', 'owner_id']), $request->user());

        return $this->showLead($lead->fresh());
    }

    public function addLeadActivity(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'activityType' => ['required', Rule::in(SalesActivity::TYPES)],
            'summary' => ['required', 'string', 'max:255'],
            'outcome' => ['nullable', 'string', 'max:255'],
            'occurredAt' => ['nullable', 'date'],
        ]);

        SalesActivity::query()->create([
            'lead_id' => $lead->id,
            'activity_type' => $data['activityType'],
            'summary' => $data['summary'],
            'outcome' => $data['outcome'] ?? null,
            'occurred_at' => $data['occurredAt'] ?? now(),
            'actor_id' => $request->user()->id,
        ]);

        return $this->showLead($lead->fresh());
    }

    public function convertLead(Request $request, Lead $lead): JsonResponse
    {
        if ($lead->converted_onboarding_id) {
            throw BusinessRuleException::conflict('This lead has already been converted to onboarding.');
        }

        $existingOnboarding = OnboardingRequest::query()->where('contact_email', $lead->contact_email)->first();
        if ($existingOnboarding) {
            throw BusinessRuleException::conflict('An onboarding request already exists for this contact email.');
        }

        $onboarding = DB::transaction(function () use ($lead, $request): OnboardingRequest {
            $req = $this->createOnboardingWithChecklist([
                'lead_id' => $lead->id,
                'institution_name' => $lead->organization_name,
                'contact_name' => $lead->contact_name,
                'contact_email' => $lead->contact_email,
                'contact_phone' => $lead->contact_phone,
                'stage' => 'agreement',
                'status' => 'active',
                'owner_id' => $lead->owner_id ?? $request->user()->id,
                'notes' => $lead->notes,
            ]);

            $lead->forceFill(['stage' => 'won', 'converted_onboarding_id' => $req->id])->save();

            return $req;
        });

        $this->audit->record('owner.lead_converted', $lead, [], ['onboardingId' => $onboarding->id], $request->user());

        return response()->json(['data' => $this->presentOnboarding($onboarding->load(['owner:id,name', 'checklistItems']))], 201);
    }

    public function onboardingList(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'stage' => ['nullable', Rule::in(OnboardingRequest::STAGES)],
            'status' => ['nullable', Rule::in(OnboardingRequest::STATUSES)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $items = OnboardingRequest::query()
            ->with(['owner:id,name', 'institution:id,code,name,status', 'checklistItems'])
            ->when($filters['stage'] ?? null, fn ($q, string $s) => $q->where('stage', $s))
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->when($filters['search'] ?? null, fn ($q, string $t) => $q->where(fn ($in) => $in
                ->where('institution_name', 'like', "%{$t}%")
                ->orWhere('contact_email', 'like', "%{$t}%")))
            ->latest('id')
            ->get();

        return response()->json(['data' => $items->map(fn (OnboardingRequest $o) => $this->presentOnboarding($o))]);
    }

    public function storeOnboarding(Request $request): JsonResponse
    {
        $data = $request->validate([
            'institutionName' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:50', 'alpha_dash'],
            'institutionType' => ['sometimes', Rule::in(Institution::TYPES)],
            'contactName' => ['required', 'string', 'max:120'],
            'contactEmail' => ['required', 'email', 'max:160'],
            'contactPhone' => ['nullable', 'string', 'max:40'],
            'country' => ['sometimes', 'string', 'max:80'],
            'state' => ['nullable', 'string', 'max:100'],
            'stage' => ['sometimes', Rule::in(OnboardingRequest::STAGES)],
            'targetGoLiveAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $onboarding = DB::transaction(fn () => $this->createOnboardingWithChecklist([
            'institution_name' => $data['institutionName'],
            'code' => isset($data['code']) ? strtoupper($data['code']) : null,
            'institution_type' => $data['institutionType'] ?? 'college',
            'contact_name' => $data['contactName'],
            'contact_email' => strtolower($data['contactEmail']),
            'contact_phone' => $data['contactPhone'] ?? null,
            'country' => $data['country'] ?? 'India',
            'state' => $data['state'] ?? null,
            'stage' => $data['stage'] ?? 'new',
            'status' => 'active',
            'owner_id' => $request->user()->id,
            'target_go_live_at' => $data['targetGoLiveAt'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]));

        $this->audit->record('owner.onboarding_created', $onboarding, [], ['name' => $onboarding->institution_name], $request->user());

        return response()->json(['data' => $this->presentOnboarding($onboarding->load(['owner:id,name', 'checklistItems']))], 201);
    }

    public function updateOnboarding(Request $request, OnboardingRequest $onboardingRequest): JsonResponse
    {
        $data = $request->validate([
            'stage' => ['sometimes', Rule::in(OnboardingRequest::STAGES)],
            'status' => ['sometimes', Rule::in(OnboardingRequest::STATUSES)],
            'code' => ['nullable', 'string', 'max:50', 'alpha_dash'],
            'blockerReason' => ['nullable', 'string', 'max:255'],
            'targetGoLiveAt' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if (($data['status'] ?? null) === 'blocked' && empty($data['blockerReason'] ?? $onboardingRequest->blocker_reason)) {
            throw BusinessRuleException::unprocessable('Specify the blocker reason before marking onboarding as blocked.');
        }

        $onboardingRequest->update([
            ...(isset($data['stage']) ? ['stage' => $data['stage']] : []),
            ...(isset($data['status']) ? ['status' => $data['status']] : []),
            ...(array_key_exists('code', $data) ? ['code' => $data['code'] ? strtoupper($data['code']) : null] : []),
            ...(array_key_exists('blockerReason', $data) ? ['blocker_reason' => $data['blockerReason']] : []),
            ...(array_key_exists('targetGoLiveAt', $data) ? ['target_go_live_at' => $data['targetGoLiveAt']] : []),
            ...(array_key_exists('notes', $data) ? ['notes' => $data['notes']] : []),
        ]);

        return response()->json(['data' => $this->presentOnboarding($onboardingRequest->fresh(['owner:id,name', 'institution:id,code,name,status', 'checklistItems']))]);
    }

    public function toggleChecklist(Request $request, OnboardingChecklist $item): JsonResponse
    {
        $completed = ! $item->is_completed;
        $item->forceFill([
            'is_completed' => $completed,
            'completed_by' => $completed ? $request->user()->id : null,
            'completed_at' => $completed ? now() : null,
        ])->save();

        return response()->json(['data' => [
            'id' => $item->id,
            'isCompleted' => $item->is_completed,
            'completedAt' => $item->completed_at?->toIso8601String(),
        ]]);
    }

    public function convertOnboardingToInstitution(Request $request, OnboardingRequest $onboardingRequest): JsonResponse
    {
        if ($onboardingRequest->institution_id) {
            throw BusinessRuleException::conflict('This onboarding request has already created an institution.');
        }

        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50', 'alpha_dash'],
            'status' => ['sometimes', Rule::in(['trial', 'active'])],
            'state' => ['nullable', 'string', 'max:80'],
            'address' => ['nullable', 'string', 'max:500'],
            'contactPhone' => ['nullable', 'string', 'max:30'],
        ]);

        $code = strtoupper($data['code'] ?? $onboardingRequest->code ?? Str::upper(Str::slug($onboardingRequest->institution_name, '_')));
        $code = Str::limit($code, 40, '');

        if (Institution::query()->withTrashed()->where('code', $code)->exists()) {
            throw BusinessRuleException::conflict("Institution code {$code} is already taken.");
        }
        if (User::query()->withoutGlobalScopes()->where('email', $onboardingRequest->contact_email)->exists()) {
            throw BusinessRuleException::conflict("A user already exists with email {$onboardingRequest->contact_email}.");
        }

        [$institution, $admin] = DB::transaction(function () use ($onboardingRequest, $data, $code, $request): array {
            $baseSlug = Str::slug($onboardingRequest->institution_name) ?: 'institution';
            $slug = $baseSlug;
            $idx = 2;
            while (Institution::query()->withTrashed()->where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$idx}";
                $idx++;
            }

            $instStatus = $data['status'] ?? 'trial';
            $institution = Institution::query()->create([
                'name' => $onboardingRequest->institution_name,
                'code' => $code,
                'slug' => $slug,
                'status' => $instStatus,
                'institution_type' => $onboardingRequest->institution_type ?: 'college',
                'official_email' => $onboardingRequest->contact_email,
                'contact_phone' => $data['contactPhone'] ?? $onboardingRequest->contact_phone ?? '+91 00000 00000',
                'country' => $onboardingRequest->country ?: 'India',
                'state' => $data['state'] ?? $onboardingRequest->state ?? 'Karnataka',
                'address' => $data['address'] ?? 'Campus Address Pending',
                'verification_status' => 'verified',
                'trial_ends_at' => $instStatus === 'trial' ? now()->addDays(30)->endOfDay() : null,
            ]);

            InstitutionStatusEvent::query()->create([
                'institution_id' => $institution->id,
                'kind' => 'lifecycle',
                'from_status' => 'prospect',
                'to_status' => $instStatus,
                'reason' => "Converted from onboarding request #{$onboardingRequest->id}",
                'effective_at' => now(),
                'applied' => true,
                'actor_id' => $request->user()->id,
                'created_at' => now(),
            ]);

            $admin = new User([
                'name' => $onboardingRequest->contact_name,
                'email' => $onboardingRequest->contact_email,
                'password' => Str::random(40),
                'role' => UserRole::InstitutionAdmin->value,
                'title' => 'Institution Administrator',
            ]);
            $admin->institution_id = $institution->id;
            $admin->save();

            $onboardingRequest->forceFill([
                'institution_id' => $institution->id,
                'code' => $institution->code,
                'stage' => 'go_live',
                'status' => 'completed',
            ])->save();

            return [$institution, $admin];
        });

        try {
            $token = Password::broker()->createToken($admin);
            $admin->notify(new VerifyAccountNotification($token, $institution->name));
        } catch (\Throwable $e) {
            Log::warning("Failed to send welcome verification link to {$admin->email}: {$e->getMessage()}");
        }
        $this->audit->record('owner.onboarding_converted', $onboardingRequest, [], ['institutionId' => $institution->id, 'code' => $institution->code], $request->user(), $institution->id);

        return response()->json([
            'data' => [
                'onboarding' => $this->presentOnboarding($onboardingRequest->fresh(['owner:id,name', 'institution:id,code,name,status', 'checklistItems'])),
                'institutionId' => $institution->id,
            ],
        ], 201);
    }

    /** @param array<string, mixed> $attributes */
    private function createOnboardingWithChecklist(array $attributes): OnboardingRequest
    {
        $req = OnboardingRequest::query()->create($attributes);
        foreach (self::DEFAULT_CHECKLIST as $idx => [$stage, $title]) {
            OnboardingChecklist::query()->create([
                'onboarding_request_id' => $req->id,
                'stage' => $stage,
                'title' => $title,
                'sort_order' => $idx + 1,
            ]);
        }

        return $req;
    }

    /** @return array<string, mixed> */
    private function presentLead(Lead $l): array
    {
        return [
            'id' => $l->id,
            'organizationName' => $l->organization_name,
            'contactName' => $l->contact_name,
            'contactEmail' => $l->contact_email,
            'contactPhone' => $l->contact_phone,
            'source' => $l->source,
            'stage' => $l->stage,
            'owner' => $l->owner ? ['id' => $l->owner->id, 'name' => $l->owner->name] : null,
            'interestedPlan' => $l->interestedPlan ? ['id' => $l->interestedPlan->id, 'code' => $l->interestedPlan->code, 'name' => $l->interestedPlan->name] : null,
            'expectedStudents' => $l->expected_students,
            'expectedMrr' => $l->expected_mrr,
            'nextFollowUpAt' => $l->next_follow_up_at?->toIso8601String(),
            'demoOutcome' => $l->demo_outcome,
            'lostReason' => $l->lost_reason,
            'convertedOnboardingId' => $l->converted_onboarding_id,
            'notes' => $l->notes,
            'activitiesCount' => $l->activities_count ?? $l->activities->count(),
            'createdAt' => $l->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentOnboarding(OnboardingRequest $o): array
    {
        $items = $o->checklistItems ?? collect();

        return [
            'id' => $o->id,
            'leadId' => $o->lead_id,
            'institution' => $o->institution ? ['id' => $o->institution->id, 'code' => $o->institution->code, 'name' => $o->institution->name, 'status' => $o->institution->status] : null,
            'institutionName' => $o->institution_name,
            'code' => $o->code,
            'institutionType' => $o->institution_type,
            'contactName' => $o->contact_name,
            'contactEmail' => $o->contact_email,
            'contactPhone' => $o->contact_phone,
            'country' => $o->country,
            'state' => $o->state,
            'stage' => $o->stage,
            'status' => $o->status,
            'owner' => $o->owner ? ['id' => $o->owner->id, 'name' => $o->owner->name] : null,
            'targetGoLiveAt' => $o->target_go_live_at?->toDateString(),
            'blockerReason' => $o->blocker_reason,
            'notes' => $o->notes,
            'checklist' => $items->map(fn (OnboardingChecklist $c) => [
                'id' => $c->id,
                'stage' => $c->stage,
                'title' => $c->title,
                'isCompleted' => $c->is_completed,
                'completedAt' => $c->completed_at?->toIso8601String(),
            ])->values(),
            'createdAt' => $o->created_at?->toIso8601String(),
        ];
    }
}

