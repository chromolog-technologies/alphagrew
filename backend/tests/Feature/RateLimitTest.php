<?php

namespace Tests\Feature;

use App\Models\Resume;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_signed_file_links_are_rate_limited_per_address(): void
    {
        // A signed link to a missing resume: the limit applies before the file lookup.
        $url = URL::temporarySignedRoute('resumes.download', now()->addMinutes(10), ['resume' => 999999]);

        for ($i = 0; $i < 60; $i++) {
            $this->get($url)->assertNotFound();
        }
        $this->get($url)->assertTooManyRequests();
    }

    public function test_student_registration_has_a_daily_cap_per_address(): void
    {
        $limits = RateLimiter::limiter('register')(Request::create('/api/v1/auth/register', 'POST', server: ['REMOTE_ADDR' => '203.0.113.5']));
        $windows = collect($limits)->map(fn ($limit) => [$limit->maxAttempts, $limit->decaySeconds])->all();

        $this->assertContains([30, 60], $windows);
        $this->assertContains([50, 86400], $windows);
    }
}
