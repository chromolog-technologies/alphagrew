<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Uses ONLY Spatie permissions system (unified from old "custom system").
     * CampusDemoSeeder handles all data: designations, users, departments, companies, etc.
     * It creates accounts with a known password, so it runs only when app.demo_seed_enabled is on.
     */
    public function run(): void
    {
        $this->call(SpatiePermissionsSeeder::class);  // Create 96 Spatie permissions + roles

        if (! config('app.demo_seed_enabled')) {
            $this->command?->warn('Skipping demo data: DEMO_SEED_ENABLED is off in this environment.');

            return;
        }

        $this->call(CampusDemoSeeder::class);  // Create demo data (users, designations, departments, etc)
    }
}
