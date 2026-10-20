<?php

namespace App\Providers;

use App\Models\Designation;
use App\Models\User;
use App\Observers\DesignationObserver;
use App\Observers\UserObserver;
use App\Support\Tenancy\Tenant;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

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
    }
}
