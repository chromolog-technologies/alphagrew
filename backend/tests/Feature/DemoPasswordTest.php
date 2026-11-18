<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DemoPasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_accounts_use_the_configured_password(): void
    {
        config(['app.demo_password' => 'Private-Demo-2026']);

        $this->seed();
        // Skipped by the default seeder in tests; the live demo runs it.
        $this->seed(\Database\Seeders\OwnerDemoSeeder::class);

        foreach (['admin@demo.com', 'student@demo.com', 'owner@demo.com'] as $email) {
            $hash = (string) User::query()->withoutGlobalScopes()->where('email', $email)->value('password');
            $this->assertTrue(Hash::check('Private-Demo-2026', $hash), $email);
            $this->assertFalse(Hash::check('demo123', $hash), $email);
        }
    }
}
