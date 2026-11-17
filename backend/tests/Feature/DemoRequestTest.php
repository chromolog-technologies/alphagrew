<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Notifications\DemoRequested;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class DemoRequestTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return [
            'name' => 'Anita Menon',
            'email' => 'Anita.Menon@College.edu.in',
            'institution' => 'St. Teresa College',
            'role' => 'Training and placement officer',
            'phone' => '+91 94000 00000',
            'size' => '500 to 2,000',
            'interests' => ['Placement Management', 'AI Interviewer'],
            'message' => 'We run about 40 drives a season.',
            ...$overrides,
        ];
    }

    public function test_a_demo_request_becomes_a_lead_and_is_emailed_to_sales(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/demo-requests', $this->payload())->assertCreated();

        $lead = Lead::query()->sole();
        $this->assertSame('St. Teresa College', $lead->organization_name);
        $this->assertSame('anita.menon@college.edu.in', $lead->contact_email);
        $this->assertSame('website', $lead->source);
        $this->assertSame('new', $lead->stage);
        $this->assertNull($lead->owner_id);
        $this->assertSame(1000, $lead->expected_students);
        $this->assertStringContainsString('Interested in: Placement Management, AI Interviewer', (string) $lead->notes);

        Notification::assertSentTo(
            new AnonymousNotifiable,
            DemoRequested::class,
            function (DemoRequested $notification, array $channels, AnonymousNotifiable $notifiable) {
                $mail = $notification->toMail($notifiable);

                return $notifiable->routes['mail'] === 'info@chromologtechnologies.com'
                    && $mail->replyTo[0][0] === 'anita.menon@college.edu.in'
                    && str_contains($mail->subject, 'St. Teresa College');
            },
        );
    }

    public function test_visitor_text_cannot_add_links_to_the_sales_email(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/demo-requests', $this->payload([
            'name' => '[Verify your account](http://evil.example)',
            'message' => 'Urgent: [reset password](http://evil.example/reset) <a href="http://evil.example">here</a>',
        ]))->assertCreated();

        Notification::assertSentTo(new AnonymousNotifiable, DemoRequested::class, function (DemoRequested $notification, array $channels, AnonymousNotifiable $notifiable) {
            $html = (string) $notification->toMail($notifiable)->render();

            // The text is shown, but no link to the visitor's address is created.
            return str_contains($html, 'Verify your account')
                && ! preg_match('/<a\s[^>]*href=["\']?http:\/\/evil\.example/i', $html);
        });
    }

    public function test_bots_that_fill_the_hidden_field_are_ignored(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/demo-requests', $this->payload(['website' => 'http://spam.example']))->assertCreated();

        $this->assertSame(0, Lead::query()->count());
        Notification::assertNothingSent();
    }

    public function test_required_fields_and_choices_are_validated(): void
    {
        $this->postJson('/api/v1/demo-requests', $this->payload(['name' => '', 'email' => 'not-an-email', 'role' => 'Wizard', 'size' => 'Huge']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'role', 'size']);

        $this->assertSame(0, Lead::query()->count());
    }

    public function test_requests_are_rate_limited(): void
    {
        Notification::fake();

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/v1/demo-requests', $this->payload())->assertCreated();
        }
        $this->postJson('/api/v1/demo-requests', $this->payload())->assertTooManyRequests();
    }
}
