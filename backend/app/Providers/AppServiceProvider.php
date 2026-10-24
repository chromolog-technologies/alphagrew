<?php

namespace App\Providers;

use App\Models\Designation;
use App\Models\User;
use App\Observers\DesignationObserver;
use App\Observers\UserObserver;
use App\Support\Tenancy\Tenant;
use Illuminate\Auth\Notifications\ResetPassword;
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

        // The reset link opens the React app, which posts the token to /auth/reset-password.
        ResetPassword::createUrlUsing(fn (User $user, string $token): string => config('app.frontend_url')
            .'/reset-password?'.http_build_query(['token' => $token, 'email' => $user->getEmailForPasswordReset()]));
    }

    /**
     * Named limiters used in routes/api.php as "throttle:<name>". Over the limit → 429.
     */
    private function configureRateLimiting(): void
    {
        $perUser = fn (Request $request): string => (string) ($request->user()?->id ?? $request->ip());

        // Per account and per address. The per-address limits are generous because a whole
        // campus lab often shares one public IP; repeated wrong passwords also lock the
        // account itself (AttemptLoginAction).
        RateLimiter::for('login', fn (Request $request): array => [
            Limit::perMinute(5)->by(Str::lower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(120)->by($request->ip()),
        ]);

        RateLimiter::for('register', fn (Request $request): Limit => Limit::perMinute(30)->by($request->ip()));

        // Viewing and accepting an invitation; the 48-character token can't be guessed.
        RateLimiter::for('invitation', fn (Request $request): Limit => Limit::perMinute(30)->by($request->ip()));

        // Forgot / reset password and the email verification link.
        RateLimiter::for('password-reset', fn (Request $request): array => [
            Limit::perMinute(3)->by(Str::lower((string) $request->input('email')).'|'.$request->ip()),
            Limit::perMinute(30)->by($request->ip()),
        ]);

        RateLimiter::for('verification', fn (Request $request): Limit => Limit::perMinute(3)->by($perUser($request)));

        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(120)->by($perUser($request)));

        RateLimiter::for('uploads', fn (Request $request): Limit => Limit::perMinute(10)->by($perUser($request)));

        RateLimiter::for('ai', fn (Request $request): Limit => Limit::perMinute((int) config('ai.rate_limits.ai'))->by($perUser($request)));

        RateLimiter::for('ai-answers', fn (Request $request): Limit => Limit::perMinute((int) config('ai.rate_limits.answers'))->by($perUser($request)));
    }
}
