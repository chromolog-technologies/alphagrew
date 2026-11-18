<?php

namespace Tests\Feature;

use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Public "Book a demo" / "Get in touch" forms land in the Owner Console sales pipeline.
 */
class DemoRequestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_demo_request_creates_a_new_website_lead_with_details(): void
    {
        $this->postJson('/api/v1/demo-requests', [
            'name' => 'Dr. Meera Nair',
            'email' => 'Meera@Horizon.edu',
            'institution' => 'Horizon Engineering Institute',
            'phone' => '+91 98450 00000',
            'role' => 'Training and placement officer',
            'size' => '500 to 2,000',
            'interests' => ['Placement Management', 'AI Interviewer'],
            'message' => 'We run around 40 drives a season.',
        ])->assertCreated()->assertJsonStructure(['message']);

        $lead = Lead::query()->sole();
        $this->assertSame('Horizon Engineering Institute', $lead->organization_name);
        $this->assertSame('meera@horizon.edu', $lead->contact_email);
        $this->assertSame('website', $lead->source);
        $this->assertSame('new', $lead->stage);
        $this->assertNull($lead->owner_id);
        $this->assertStringContainsString('Interested in: Placement Management, AI Interviewer', $lead->notes);
        $this->assertStringContainsString('Message: We run around 40 drives a season.', $lead->notes);
        $this->assertSame(1, $lead->activities()->count());
    }

    public function test_short_get_in_touch_form_needs_only_name_and_email(): void
    {
        $this->postJson('/api/v1/demo-requests', [
            'name' => 'Ravi',
            'email' => 'ravi@example.com',
            'phone' => '9845000000',
            'form' => 'get_in_touch',
        ])->assertCreated();

        $lead = Lead::query()->sole();
        $this->assertSame('Not given', $lead->organization_name);
        $this->assertStringContainsString('Get in touch', $lead->notes);
    }

    public function test_invalid_requests_are_rejected(): void
    {
        $this->postJson('/api/v1/demo-requests', ['name' => '', 'email' => 'not-an-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email']);

        $this->assertSame(0, Lead::query()->count());
    }

    public function test_honeypot_submissions_are_accepted_but_not_stored(): void
    {
        $this->postJson('/api/v1/demo-requests', [
            'name' => 'Bot',
            'email' => 'bot@example.com',
            'website' => 'https://spam.example',
        ])->assertCreated();

        $this->assertSame(0, Lead::query()->count());
    }

    public function test_demo_requests_are_rate_limited_per_address(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/demo-requests', ['name' => "Visitor {$i}", 'email' => "v{$i}@example.com"])->assertCreated();
        }

        $this->postJson('/api/v1/demo-requests', ['name' => 'Visitor 4', 'email' => 'v4@example.com'])->assertTooManyRequests();
    }
}
