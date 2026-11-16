<?php

namespace Tests\Feature;

use App\Models\NotificationPreference;
use App\Models\User;
use App\Notifications\CampusNotification;
use App\Notifications\Channels\SmsChannel;
use App\Services\Sms\SmsManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * SMS as a notification channel: off unless the platform has a driver and the user opts in,
 * sent to the user's (or their student record's) phone, through the configured provider.
 */
class SmsNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_preferences_offer_sms_only_when_a_driver_is_configured(): void
    {
        config(['services.sms.driver' => null]);
        $this->login('student@demo.com')->getJson('/api/v1/notifications/preferences')
            ->assertOk()->assertJsonPath('meta.smsAvailable', false)->assertJsonPath('data.0.sms', false);

        config(['services.sms.driver' => 'log']);
        User::query()->withoutGlobalScopes()->where('email', 'student@demo.com')->update(['phone' => '98765 43210']);
        $this->login('student@demo.com')->putJson('/api/v1/notifications/preferences', ['preferences' => [
            ['category' => 'academics', 'inApp' => true, 'mail' => false, 'sms' => true],
        ]])->assertOk()
            ->assertJsonPath('meta.smsAvailable', true)
            ->assertJsonPath('meta.smsPhone', '+919876543210')
            ->assertJsonFragment(['category' => 'academics', 'inApp' => true, 'mail' => false, 'sms' => true]);
    }

    public function test_an_opted_in_user_gets_the_sms_and_others_do_not(): void
    {
        config(['services.sms.driver' => 'log']);
        Log::spy();
        $user = User::query()->withoutGlobalScopes()->where('email', 'student@demo.com')->firstOrFail();
        $user->forceFill(['phone' => '+44 7700 900123'])->save();

        $user->notify(new SmsTestNotification());
        $this->assertNotContains(SmsChannel::class, (new SmsTestNotification())->via($user), 'SMS is off by default.');
        Log::shouldNotHaveReceived('info', [\Mockery::pattern('/^SMS to/')]);

        NotificationPreference::query()->create(['user_id' => $user->id, 'category' => 'academics', 'in_app' => true, 'mail' => false, 'sms' => true]);
        $user->notify(new SmsTestNotification());
        Log::shouldHaveReceived('info')->withArgs(fn (string $message) => str_starts_with($message, 'SMS to +447700900123: ') && str_contains($message, 'Results published - Semester 1 results are out.'))->once();

        // A student without an account phone falls back to the student record's; with neither
        // there is nothing to send to.
        $user->forceFill(['phone' => null])->save();
        \App\Models\Student::query()->withoutGlobalScopes()->where('user_id', $user->id)->update(['phone' => '9123456780']);
        $this->assertSame('9123456780', $user->routeNotificationForSms());
        \App\Models\Student::query()->withoutGlobalScopes()->where('user_id', $user->id)->update(['phone' => null]);
        $this->assertNotContains(SmsChannel::class, (new SmsTestNotification())->via($user));
    }

    public function test_provider_drivers_call_their_apis(): void
    {
        Http::fake(['api.twilio.com/*' => Http::response(['sid' => 'SM1']), 'control.msg91.com/*' => Http::response(['type' => 'success'])]);

        config(['services.sms.driver' => 'twilio', 'services.sms.twilio' => ['sid' => 'AC1', 'token' => 't', 'from' => '+15550001111']]);
        app(SmsManager::class)->sender()->send('+919876543210', 'Hello');
        config(['services.sms.driver' => 'msg91', 'services.sms.msg91' => ['key' => 'k', 'flow_id' => 'f1']]);
        app(SmsManager::class)->sender()->send('+919876543210', 'Hello');

        Http::assertSent(fn ($request) => str_contains($request->url(), '/Accounts/AC1/Messages.json') && $request['To'] === '+919876543210' && $request['Body'] === 'Hello');
        Http::assertSent(fn ($request) => str_contains($request->url(), 'msg91') && $request['recipients'][0]['mobiles'] === '919876543210');

        $this->assertSame('+919876543210', SmsManager::normalise('098765 43210'));
        $this->assertNull(SmsManager::normalise('12345'));
    }

    private function login(string $email): self
    {
        $this->app['auth']->forgetGuards();
        $token = $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => 'demo123'])->assertOk()->json('token');

        return $this->withToken($token);
    }
}

class SmsTestNotification extends CampusNotification
{
    public function category(): string
    {
        return 'academics';
    }

    public function title(): string
    {
        return 'Results published';
    }

    public function body(): string
    {
        return 'Semester 1 results are out.';
    }
}
