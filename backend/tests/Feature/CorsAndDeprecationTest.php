<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CorsAndDeprecationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_frontend_origin_may_call_the_api_and_read_the_headers_it_needs(): void
    {
        $origin = rtrim((string) config('app.frontend_url'), '/');

        $response = $this->call('OPTIONS', '/api/v1/auth/login', server: [
            'HTTP_ORIGIN' => $origin,
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,authorization',
        ]);

        $response->assertHeader('Access-Control-Allow-Origin', $origin);

        $exposed = $this->getJson('/api/v1/auth/me', ['Origin' => $origin])->headers->get('Access-Control-Expose-Headers');
        $this->assertStringContainsString('X-Data-Source', (string) $exposed);
        $this->assertStringContainsString('Content-Disposition', (string) $exposed);
    }

    public function test_other_origins_are_not_allowed(): void
    {
        $response = $this->call('OPTIONS', '/api/v1/auth/login', server: [
            'HTTP_ORIGIN' => 'https://evil.example',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        // With one allowed origin the header always names it, so the browser refuses any other site.
        $this->assertNotSame('https://evil.example', $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_legacy_endpoints_point_to_their_replacement(): void
    {
        $this->seed();
        $token = (string) $this->postJson('/api/v1/auth/login', ['email' => 'placement@demo.com', 'password' => 'demo123'])
            ->assertOk()
            ->json('token');

        $legacy = $this->withToken($token)->getJson('/api/v1/staff/placement/drives')->assertOk();
        $legacy->assertHeader('Deprecation', 'true');
        $this->assertStringContainsString('/api/v1/placement/jobs>; rel="successor-version"', (string) $legacy->headers->get('Link'));

        $current = $this->withToken($token)->getJson('/api/v1/placement/jobs')->assertOk();
        $this->assertNull($current->headers->get('Deprecation'));
    }
}
