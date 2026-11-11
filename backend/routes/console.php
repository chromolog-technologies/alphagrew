<?php

use App\Actions\Interviews\FinishInterviewAction;
use App\Actions\Placement\OfferActions;
use App\Enums\InterviewStatus;
use App\Enums\UserRole;
use App\Models\AiInterview;
use App\Models\Institution;
use App\Models\User;
use App\Support\Tenancy\InstitutionScope;
use App\Support\Tenancy\Tenant;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('alphagrew:super-admin {email} {name} {--password=}', function (string $email, string $name) {
    $password = $this->option('password') ?: $this->secret('Password (min 8 characters)');

    $validator = Validator::make(
        ['email' => $email, 'name' => $name, 'password' => $password],
        [
            'email' => ['required', 'email', 'unique:users,email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ],
    );

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $message) {
            $this->error($message);
        }

        return 1;
    }

    $user = User::query()->create([
        'name' => $name,
        'email' => $email,
        'password' => $password,
        'role' => UserRole::SuperAdmin->value,
        'institution_id' => null,
        'title' => 'Super Admin',
    ]);
    $user->forceFill(['email_verified_at' => now()])->save();
    $user->syncRoles([Role::findOrCreate(UserRole::SuperAdmin->value, 'sanctum')]);

    $this->info("Super Admin {$email} created.");

    return 0;
})->purpose('Create a platform Super Admin account (not available through the API)');

Artisan::command('interviews:close-idle', function (FinishInterviewAction $finish) {
    $cutoff = now()->subMinutes(config('ai.interviews.idle_minutes'));
    $closed = 0;

    // Platform-wide (no tenant context in the scheduler); FinishInterviewAction evaluates any
    // session with answers and abandons the rest.
    AiInterview::withoutGlobalScope(InstitutionScope::class)
        ->where('status', InterviewStatus::InProgress->value)
        ->where('started_at', '<', $cutoff)
        ->whereDoesntHave('turns', fn ($turns) => $turns->withoutGlobalScope(InstitutionScope::class)
            ->where(fn ($q) => $q->where('asked_at', '>=', $cutoff)->orWhere('answered_at', '>=', $cutoff)))
        ->each(function (AiInterview $interview) use ($finish, &$closed): void {
            $finish->execute($interview, 'idle_timeout');
            $closed++;
        });

    $this->info("Closed {$closed} idle interviews.");
})->purpose('End AI mock interviews with no activity for the idle limit');

Schedule::command('interviews:close-idle')->everyFiveMinutes();

// API tokens expire after SANCTUM_EXPIRATION minutes; remove them a day later.
Schedule::command('sanctum:prune-expired --hours=24')->daily();

// Offers not answered by their respond-by date expire (PRD v1.1 §6). One institution at a
// time, inside its tenant context, so every query and notification stays scoped.
Artisan::command('placement:expire-offers', function (OfferActions $offers, Tenant $tenant) {
    $expired = 0;

    foreach (Institution::query()->pluck('id') as $institutionId) {
        $expired += $tenant->runAs((int) $institutionId, fn () => $offers->expireDue());
    }

    $this->info("Expired {$expired} offers.");
})->purpose('Expire placement offers past their respond-by date');

Schedule::command('placement:expire-offers')->hourly();

// Owner console: institution suspensions/reactivations scheduled for later (SRS FR-IN-006).
Artisan::command('owner:apply-scheduled-status-changes', function (\App\Services\Owner\InstitutionLifecycle $lifecycle) {
    $this->info('Applied '.$lifecycle->applyDue().' scheduled institution status changes.');
})->purpose('Apply institution lifecycle changes whose effective time has come');

Schedule::command('owner:apply-scheduled-status-changes')->everyFifteenMinutes();

// Heartbeat for the owner console's system health page.
Schedule::call(fn () => \Illuminate\Support\Facades\Cache::put(\App\Services\Owner\SystemHealth::HEARTBEAT_KEY, time(), 3600))->everyMinute()->name('owner-heartbeat');
