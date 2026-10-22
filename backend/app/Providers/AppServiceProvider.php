<?php

namespace App\Providers;

use App\Models\Designation;
use App\Models\User;
use App\Observers\DesignationObserver;
use App\Observers\UserObserver;
use App\Support\Tenancy\Tenant;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One tenant context per request / queued job.
        $this->app->scoped(Tenant::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(function ($user, string $ability): ?bool {
            if ($user instanceof User && $user->isAdmin()) {
                return true;
            }

            return null;
        });

        // Register model observers for automatic permission syncing
        User::observe(UserObserver::class);
        Designation::observe(DesignationObserver::class);

        $this->configureRateLimiting();
    }

    /**
     * Named limiters used in routes/api.php as "throttle:<name>". Over the limit → 429.
     */
    private function configureRateLimiting(): void
    {
        $perUser = fn (Request $request): string => (string) ($request->user()?->id ?? $request->ip());

        // Per account and per address, so one address can't try many accounts quickly.
        RateLimiter::for('login', fn (Request $request): array => [
            Limit::perMinute(5)->by(Str::lower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(20)->by($request->ip()),
        ]);

        RateLimiter::for('register', fn (Request $request): Limit => Limit::perMinute(5)->by($request->ip()));

        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(120)->by($perUser($request)));

        RateLimiter::for('uploads', fn (Request $request): Limit => Limit::perMinute(10)->by($perUser($request)));

        RateLimiter::for('ai', fn (Request $request): Limit => Limit::perMinute((int) config('ai.rate_limits.ai'))->by($perUser($request)));

        RateLimiter::for('ai-answers', fn (Request $request): Limit => Limit::perMinute((int) config('ai.rate_limits.answers'))->by($perUser($request)));
    }
}
