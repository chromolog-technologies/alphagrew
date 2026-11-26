<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ApplicationStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\JobApplication;
use App\Models\JobApplicationEvent;
use App\Models\JobPosting;
use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use App\Services\Audit\AuditLogger;
use App\Support\Campus\CampusPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * Recruiter portal.
 * - The placement office (placement.create) creates recruiter accounts for a company; each gets
 *   an email to set a password, and belongs to the institution and the company.
 * - Recruiters see their company's jobs and only the candidates the placement office has moved
 *   past "applied" (shortlisted, in rounds, selected, offered, placed). They leave feedback,
 *   recorded on the application history; they never change statuses or make offers.
 */
class RecruiterController extends Controller
{
    private const SHARED_STATUSES = [
        ApplicationStatus::Shortlisted, ApplicationStatus::InRounds, ApplicationStatus::Selected,
        ApplicationStatus::Offered, ApplicationStatus::Placed,
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    // ---- Placement office ---------------------------------------------------------------------

    public function index(Request $request, Company $company): JsonResponse
    {
        $this->ensurePlacementOffice($request->user());
        $recruiters = User::query()->where('role', UserRole::Recruiter->value)->where('company_id', $company->id)->orderBy('name')->get();

        return response()->json(['data' => $recruiters->map(fn (User $u) => [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'status' => $u->status, 'lastLoginAt' => $u->last_login_at?->toIso8601String(),
        ])->all()]);
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        $this->ensurePlacementOffice($request->user());
        $v = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
        ]);

        $recruiter = User::query()->create([
            'name' => $v['name'], 'email' => strtolower($v['email']), 'password' => Str::random(40),
            'role' => UserRole::Recruiter->value, 'status' => UserStatus::Active->value,
            'institution_id' => $request->user()->institution_id, 'title' => 'Recruiter, '.$company->name,
        ]);
        $recruiter->forceFill(['company_id' => $company->id, 'email_verified_at' => now()])->save();
        $recruiter->syncRoles([UserRole::Recruiter->value]);
        $recruiter->syncPermissions(CampusPermission::forRole(UserRole::Recruiter->value, []));
        $this->audit->record('recruiter.created', $recruiter, [], ['company_id' => $company->id, 'email' => $recruiter->email]);

        $emailSent = true;
        try {
            $recruiter->notify(new VerifyAccountNotification(Password::broker()->createToken($recruiter)));
        } catch (Throwable $e) {
            $emailSent = false;
            Log::warning("Recruiter invite to {$recruiter->email} failed: {$e->getMessage()}");
        }

        return response()->json(['data' => ['id' => $recruiter->id, 'name' => $recruiter->name, 'email' => $recruiter->email, 'emailSent' => $emailSent]], 201);
    }

    /** Deactivates the account (signed out everywhere); the history stays. */
    public function destroy(Request $request, Company $company, User $recruiter): JsonResponse
    {
        $this->ensurePlacementOffice($request->user());
        abort_unless($recruiter->role === UserRole::Recruiter->value && $recruiter->company_id === $company->id, 404);

        $recruiter->tokens()->delete();
        $recruiter->update(['status' => UserStatus::Suspended->value]);
        $this->audit->record('recruiter.deactivated', $recruiter, [], ['company_id' => $company->id]);

        return response()->json(['message' => 'Recruiter access removed.']);
    }

    // ---- Recruiters ---------------------------------------------------------------------------

    public function jobs(Request $request): JsonResponse
    {
        $company = $this->recruiterCompany($request->user());
        $jobs = JobPosting::query()->where('company_id', $company->id)->orderByDesc('id')->get();
        $counts = JobApplication::query()
            ->whereIn('job_posting_id', $jobs->pluck('id'))
            ->whereIn('status', array_map(fn ($s) => $s->value, self::SHARED_STATUSES))
            ->selectRaw('job_posting_id, COUNT(*) as n')->groupBy('job_posting_id')->pluck('n', 'job_posting_id');

        return response()->json([
            'data' => $jobs->map(fn (JobPosting $j) => [
                'id' => $j->id, 'title' => $j->title, 'location' => $j->location, 'employmentType' => $j->employment_type,
                'status' => $j->status, 'packageDisplay' => $j->package_display, 'openings' => $j->openings,
                'sharedCandidates' => (int) ($counts[$j->id] ?? 0),
            ])->all(),
            'meta' => ['company' => ['id' => $company->id, 'name' => $company->name]],
        ]);
    }

    public function candidates(Request $request, JobPosting $job): JsonResponse
    {
        $company = $this->recruiterCompany($request->user());
        abort_unless($job->company_id === $company->id, 404);

        $applications = JobApplication::query()
            ->with(['student:id,name,registration_number,department_code,year,cgpa', 'student.academicSummary', 'events' => fn ($q) => $q->latest()])
            ->where('job_posting_id', $job->id)
            ->whereIn('status', array_map(fn ($s) => $s->value, self::SHARED_STATUSES))
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $applications->map(fn (JobApplication $a) => [
            'applicationId' => $a->id,
            'status' => $a->status instanceof ApplicationStatus ? $a->status->value : $a->status,
            'student' => [
                'name' => $a->student?->name, 'registrationNumber' => $a->student?->registration_number,
                'department' => $a->student?->department_code, 'year' => $a->student?->year,
                'cgpa' => $a->student?->academicSummary?->cgpa ?? $a->student?->cgpa,
            ],
            'feedback' => $a->events->filter(fn (JobApplicationEvent $e) => str_starts_with((string) $e->note, 'Recruiter feedback'))
                ->map(fn (JobApplicationEvent $e) => ['note' => $e->note, 'at' => $e->created_at?->toIso8601String()])->values()->all(),
        ])->all()]);
    }

    public function feedback(Request $request, JobApplication $application): JsonResponse
    {
        $user = $request->user();
        $company = $this->recruiterCompany($user);
        $application->loadMissing('jobPosting');
        $status = $application->status instanceof ApplicationStatus ? $application->status : ApplicationStatus::from((string) $application->status);
        abort_unless($application->jobPosting?->company_id === $company->id && in_array($status, self::SHARED_STATUSES, true), 404);

        $v = $request->validate([
            'decision' => ['required', Rule::in(['recommend', 'hold', 'reject'])],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $label = ['recommend' => 'recommend', 'hold' => 'on hold', 'reject' => 'not a fit'][$v['decision']];
        $event = JobApplicationEvent::query()->create([
            'job_application_id' => $application->id, 'from_status' => $status->value, 'to_status' => $status->value, 'actor_id' => $user->id,
            'note' => trim("Recruiter feedback ({$user->name}): {$label}. ".($v['note'] ?? '')),
        ]);
        $this->audit->record('recruiter.feedback', $application, [], ['decision' => $v['decision']]);

        return response()->json(['data' => ['note' => $event->note, 'at' => $event->created_at?->toIso8601String()]], 201);
    }

    // ---- Helpers ------------------------------------------------------------------------------

    private function ensurePlacementOffice(User $user): void
    {
        abort_unless($user->can(CampusPermission::PLACEMENT_CREATE), 403, 'Only the placement office manages recruiter accounts.');
    }

    private function recruiterCompany(User $user): Company
    {
        abort_unless($user->role === UserRole::Recruiter->value && $user->company_id, 403, 'This page is for recruiters.');

        return Company::query()->findOrFail($user->company_id);
    }
}
