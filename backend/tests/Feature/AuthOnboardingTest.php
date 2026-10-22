<?php

namespace Tests\Feature;

use App\Actions\Auth\AttemptLoginAction;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\Designation;
use App\Models\Institution;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationSent;
use App\Notifications\RegistrationReviewed;
use App\Support\Tenancy\InstitutionScope;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use LogicException;
use Tests\TestCase;

/**
 * Slice 1: password reset, email verification, invitations, registration approval,
 * sessions, lockout and the audit log.
 */
class AuthOnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        Notification::fake();
    }

    public function test_password_reset_changes_the_password_and_signs_out_everywhere(): void
    {
        $oldToken = $this->tokenFor('staff@demo.com');

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'staff@demo.com'])->assertOk();
        // Unknown addresses get the same answer.
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])
            ->assertOk()
            ->assertJsonPath('message', 'If an account exists for this email, we have sent a link to reset the password.');

        $user = User::query()->where('email', 'staff@demo.com')->firstOrFail();
        $resetToken = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$resetToken, $user): bool {
            $resetToken = $notification->token;

            return str_starts_with($notification->toMail($user)->actionUrl, config('app.frontend_url').'/reset-password?');
        });

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'wrong-token', 'email' => 'staff@demo.com', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $resetToken, 'email' => 'staff@demo.com', 'password' => 'new-password-1', 'password_confirmation' => 'new-password-1',
        ])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($oldToken)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->tokenFor('staff@demo.com', 'new-password-1');
        $this->assertAuditLogged('auth.password_reset', $user->id);
    }

    public function test_self_registration_waits_for_email_verification_and_approval(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Asha Pending',
            'email' => 'asha@example.com',
            'password' => 'secret123',
            'institutionCode' => 'DEFAULT',
            'departmentCode' => 'CSE',
        ])
            ->assertCreated()
            ->assertJsonMissingPath('token')
            ->assertJsonPath('user.status', UserStatus::PendingApproval->value)
            ->assertJsonPath('user.emailVerified', false);

        $user = User::query()->where('email', 'asha@example.com')->firstOrFail();
        Notification::assertSentTo($user, VerifyEmail::class);

        $this->postJson('/api/v1/auth/login', ['email' => 'asha@example.com', 'password' => 'secret123'])
            ->assertForbidden()
            ->assertJsonPath('message', UserStatus::PendingApproval->signInMessage());

        // The admin's queue shows the registration; approving lets the student sign in.
        $admin = $this->tokenFor('admin@demo.com');
        $this->withToken($admin)->getJson('/api/v1/registrations')
            ->assertOk()
            ->assertJsonPath('data.0.email', 'asha@example.com')
            ->assertJsonPath('data.0.emailVerified', false);

        $this->withToken($admin)->postJson("/api/v1/registrations/{$user->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::Active->value);
        $this->withToken($admin)->postJson("/api/v1/registrations/{$user->id}/approve")->assertStatus(409);
        Notification::assertSentTo($user, RegistrationReviewed::class);

        $this->app['auth']->forgetGuards();
        $studentToken = $this->tokenFor('asha@example.com', 'secret123');

        // Applying needs a verified address.
        $companyId = Company::query()->whereJsonContains('eligible_departments', 'CSE')->where('status', '!=', 'closed')->value('id');
        $this->withToken($studentToken)->postJson("/api/v1/companies/{$companyId}/apply")
            ->assertForbidden()
            ->assertJsonPath('message', 'Your email address is not verified.');

        $verifyUrl = URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]);
        $this->get($verifyUrl)->assertRedirect(config('app.frontend_url').'/?verified=1');
        $this->assertTrue($user->fresh()->hasVerifiedEmail());

        // A tampered link is refused by the signature check.
        $this->get($verifyUrl.'x')->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->withToken($studentToken)->postJson("/api/v1/companies/{$companyId}/apply")->assertOk();
    }

    public function test_rejected_registrations_cannot_sign_in(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Ravi Rejected',
            'email' => 'ravi@example.com',
            'password' => 'secret123',
            'institutionCode' => 'DEFAULT',
            'departmentCode' => 'CSE',
        ])->assertCreated();
        $user = User::query()->where('email', 'ravi@example.com')->firstOrFail();

        $admin = $this->tokenFor('admin@demo.com');
        $this->withToken($admin)->postJson("/api/v1/registrations/{$user->id}/reject", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('reason');
        $this->withToken($admin)->postJson("/api/v1/registrations/{$user->id}/reject", ['reason' => 'Not enrolled this year.'])
            ->assertOk()
            ->assertJsonPath('data.status', UserStatus::Rejected->value);

        $this->postJson('/api/v1/auth/login', ['email' => 'ravi@example.com', 'password' => 'secret123'])
            ->assertForbidden()
            ->assertJsonPath('message', UserStatus::Rejected->signInMessage().' Not enrolled this year.');
        $this->assertAuditLogged('registration.rejected', $user->id);
    }

    public function test_invited_students_and_staff_create_verified_accounts(): void
    {
        $admin = $this->tokenFor('admin@demo.com');

        $this->withToken($admin)->postJson('/api/v1/invitations', [
            'emails' => ['New.Student@Example.com ', 'student@demo.com', 'new.student@example.com'],
            'role' => UserRole::Student->value,
            'departmentCode' => 'cse',
        ])
            ->assertCreated()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'new.student@example.com')
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('skipped.0.email', 'student@demo.com');

        $token = $this->sentInvitationToken('new.student@example.com');

        $this->getJson("/api/v1/invitations/accept/{$token}")
            ->assertOk()
            ->assertJsonPath('data.email', 'new.student@example.com')
            ->assertJsonPath('data.role', UserRole::Student->value);
        $this->getJson('/api/v1/invitations/accept/not-a-token')->assertNotFound();

        $this->postJson("/api/v1/invitations/accept/{$token}", ['name' => 'Nia Student', 'password' => 'short', 'password_confirmation' => 'short'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->postJson("/api/v1/invitations/accept/{$token}", ['name' => 'Nia Student', 'password' => 'secret-pass-1', 'password_confirmation' => 'secret-pass-1'])
            ->assertCreated()
            ->assertJsonStructure(['token', 'user', 'data'])
            ->assertJsonPath('user.role', UserRole::Student->value)
            ->assertJsonPath('user.emailVerified', true)
            ->assertJsonPath('user.status', UserStatus::Active->value)
            ->assertJsonPath('user.departmentCode', 'CSE');

        // A token works once.
        $this->postJson("/api/v1/invitations/accept/{$token}", ['name' => 'Again', 'password' => 'secret-pass-1', 'password_confirmation' => 'secret-pass-1'])
            ->assertStatus(409);

        // Staff invitations need a designation.
        $this->app['auth']->forgetGuards();
        $this->withToken($admin)->postJson('/api/v1/invitations', [
            'emails' => ['new.faculty@example.com'],
            'role' => UserRole::Staff->value,
            'departmentCode' => 'CSE',
        ])->assertUnprocessable()->assertJsonValidationErrors('designationId');

        $designationId = Designation::query()->create([
            'institution_id' => Institution::defaultId(),
            'name' => 'Assistant Professor',
            'slug' => 'assistant-professor',
            'status' => 'active',
        ])->id;
        $this->withToken($admin)->postJson('/api/v1/invitations', [
            'emails' => ['new.faculty@example.com'],
            'role' => UserRole::Staff->value,
            'departmentCode' => 'CSE',
            'designationId' => $designationId,
        ])->assertCreated();

        $this->postJson('/api/v1/invitations/accept/'.$this->sentInvitationToken('new.faculty@example.com'), [
            'name' => 'Farah Faculty', 'password' => 'secret-pass-2', 'password_confirmation' => 'secret-pass-2',
        ])
            ->assertCreated()
            ->assertJsonPath('user.role', UserRole::Staff->value)
            ->assertJsonPath('user.designationId', $designationId);

        $this->assertAuditLogged('invitation.created');
        $this->assertAuditLogged('invitation.accepted');
    }

    public function test_invitations_can_be_revoked_and_expire(): void
    {
        $admin = $this->tokenFor('admin@demo.com');

        $id = $this->withToken($admin)->postJson('/api/v1/invitations', [
            'emails' => ['revoke.me@example.com'],
            'role' => UserRole::Student->value,
            'departmentCode' => 'CSE',
        ])->assertCreated()->json('data.0.id');
        $token = $this->sentInvitationToken('revoke.me@example.com');

        $this->withToken($admin)->deleteJson("/api/v1/invitations/{$id}")->assertOk()->assertJsonPath('data.status', 'revoked');
        $this->postJson("/api/v1/invitations/accept/{$token}", ['name' => 'X', 'password' => 'secret-pass-1', 'password_confirmation' => 'secret-pass-1'])
            ->assertStatus(409);

        // Resending issues a new token and makes the invitation pending again; the old token stops working.
        $this->withToken($admin)->postJson("/api/v1/invitations/{$id}/resend")->assertOk()->assertJsonPath('data.status', 'pending');
        $this->getJson("/api/v1/invitations/accept/{$token}")->assertNotFound();

        Invitation::query()->whereKey($id)->update(['expires_at' => now()->subMinute()]);
        $this->postJson('/api/v1/invitations/accept/'.$this->sentInvitationToken('revoke.me@example.com'), [
            'name' => 'X', 'password' => 'secret-pass-1', 'password_confirmation' => 'secret-pass-1',
        ])->assertStatus(409)->assertJsonPath('message', 'This invitation is expired. Ask your institution for a new one.');

        $this->withToken($admin)->getJson('/api/v1/invitations?status=expired')->assertOk()->assertJsonPath('meta.total', 1);
    }

    public function test_only_admins_manage_invitations_and_each_institution_sees_its_own(): void
    {
        $this->withToken($this->tokenFor('student@demo.com'))->getJson('/api/v1/invitations')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor('student@demo.com'))->getJson('/api/v1/registrations')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->withToken($this->tokenFor('student@demo.com'))->getJson('/api/v1/audit-logs')->assertForbidden();

        $other = Institution::query()->create(['name' => 'Other College', 'code' => 'OTHER', 'slug' => 'other', 'status' => 'active']);
        $foreign = Invitation::withoutGlobalScope(InstitutionScope::class)->create([
            'institution_id' => $other->id,
            'email' => 'foreign@example.com',
            'role' => UserRole::Student->value,
            'department_code' => 'CSE',
            'token_hash' => Invitation::hashToken('foreign-token'),
            'expires_at' => now()->addDay(),
        ]);

        $this->app['auth']->forgetGuards();
        $admin = $this->tokenFor('admin@demo.com');
        $this->withToken($admin)->getJson('/api/v1/invitations')->assertOk()->assertJsonPath('meta.total', 0);
        $this->withToken($admin)->deleteJson("/api/v1/invitations/{$foreign->id}")->assertNotFound();
        $this->assertNull($foreign->fresh()->revoked_at);
    }

    public function test_repeated_wrong_passwords_lock_the_account(): void
    {
        // The per-address login rate limit would answer 429 first; this checks the account lock.
        $this->withoutMiddleware(ThrottleRequests::class);

        for ($i = 0; $i < AttemptLoginAction::MAX_FAILED_ATTEMPTS; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'staff@demo.com', 'password' => 'wrong'])->assertUnprocessable();
        }

        $this->postJson('/api/v1/auth/login', ['email' => 'staff@demo.com', 'password' => 'demo123'])->assertStatus(423);
        $this->assertAuditLogged('auth.locked');

        $this->travel(AttemptLoginAction::LOCK_MINUTES + 1)->minutes();
        $this->postJson('/api/v1/auth/login', ['email' => 'staff@demo.com', 'password' => 'demo123'])->assertOk();
        $this->assertSame(0, User::query()->where('email', 'staff@demo.com')->value('failed_login_attempts'));
    }

    public function test_users_can_list_and_end_their_sessions(): void
    {
        $first = $this->tokenFor('staff@demo.com');
        $second = $this->tokenFor('staff@demo.com');
        $third = $this->tokenFor('staff@demo.com');

        $sessions = $this->withToken($second)->getJson('/api/v1/auth/sessions')->assertOk()->json('data');
        $this->assertCount(3, $sessions);
        $this->assertSame([true], array_values(array_unique(array_column(array_filter($sessions, fn (array $s): bool => $s['current']), 'current'))));

        $firstId = (int) explode('|', $first)[0];
        $this->withToken($second)->deleteJson("/api/v1/auth/sessions/{$firstId}")->assertOk();
        $this->withToken($second)->deleteJson('/api/v1/auth/sessions/999999')->assertNotFound();
        $this->withToken($second)->deleteJson('/api/v1/auth/sessions')->assertOk()->assertJsonPath('revoked', 1);

        $this->app['auth']->forgetGuards();
        $this->withToken($first)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($third)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($second)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_audit_log_is_scoped_filterable_and_append_only(): void
    {
        $admin = $this->tokenFor('admin@demo.com');
        $this->withToken($admin)->postJson('/api/v1/invitations', [
            'emails' => ['audited@example.com'],
            'role' => UserRole::Student->value,
            'departmentCode' => 'CSE',
        ])->assertCreated();

        $other = Institution::query()->create(['name' => 'Other College', 'code' => 'OTHER', 'slug' => 'other', 'status' => 'active']);
        AuditLog::withoutGlobalScope(InstitutionScope::class)->forceCreate(['institution_id' => $other->id, 'action' => 'auth.login']);

        $this->withToken($admin)->getJson('/api/v1/audit-logs?action=auth.login')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.actorName', 'Dr. Nandita Roy');

        $this->withToken($admin)->getJson('/api/v1/audit-logs?action=invitation.')
            ->assertOk()
            ->assertJsonPath('data.0.action', 'invitation.created')
            ->assertJsonPath('data.0.newValues.emails.0', 'audited@example.com');

        $log = AuditLog::query()->firstOrFail();
        $this->expectException(LogicException::class);
        $log->update(['action' => 'tampered']);
    }

    public function test_changing_the_profile_email_requires_verifying_it_again(): void
    {
        $token = $this->tokenFor('staff@demo.com');
        $other = $this->tokenFor('staff@demo.com');

        $this->withToken($token)->putJson('/api/v1/auth/profile', [
            'name' => 'Meera Nair',
            'email' => 'meera.new@example.com',
            'title' => 'Department Coordinator',
            'password' => 'another-pass-1',
        ])->assertOk()->assertJsonPath('user.emailVerified', false);

        Notification::assertSentTo(User::query()->where('email', 'meera.new@example.com')->firstOrFail(), VerifyEmail::class);

        // The password change signed out the other device but kept this one.
        $this->app['auth']->forgetGuards();
        $this->withToken($other)->getJson('/api/v1/auth/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/auth/me')->assertOk();
    }

    private function sentInvitationToken(string $email): string
    {
        $token = null;
        Notification::assertSentOnDemand(InvitationSent::class, function (InvitationSent $notification, array $channels, AnonymousNotifiable $notifiable) use ($email, &$token): bool {
            if (($notifiable->routes['mail'] ?? null) !== $email) {
                return false;
            }
            $token = $notification->token;

            return true;
        });

        return (string) $token;
    }

    private function assertAuditLogged(string $action, ?int $subjectId = null): void
    {
        $query = AuditLog::withoutGlobalScope(InstitutionScope::class)->where('action', $action);
        if ($subjectId !== null) {
            $query->where('subject_id', $subjectId);
        }

        $this->assertTrue($query->exists(), "No audit log entry for {$action}.");
    }

    private function tokenFor(string $email, string $password = 'demo123'): string
    {
        return (string) $this->postJson('/api/v1/auth/login', ['email' => $email, 'password' => $password])
            ->assertOk()
            ->json('token');
    }
}
