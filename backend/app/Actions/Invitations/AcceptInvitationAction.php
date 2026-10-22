<?php

namespace App\Actions\Invitations;

use App\Actions\Staff\SaveStaffMemberAction;
use App\Actions\Students\CreateStudentAction;
use App\DTOs\StaffMemberData;
use App\DTOs\StudentData;
use App\Enums\UserRole;
use App\Exceptions\BusinessRuleException;
use App\Models\Department;
use App\Models\Invitation;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\InstitutionScope;
use App\Support\Tenancy\Tenant;
use Illuminate\Support\Facades\DB;

/**
 * Creates the invited account in the invitation's institution. The address is
 * treated as verified: the invitee received the link at it.
 */
class AcceptInvitationAction
{
    public function __construct(
        private readonly Tenant $tenant,
        private readonly CreateStudentAction $createStudent,
        private readonly SaveStaffMemberAction $saveStaff,
        private readonly AuditLogger $audit,
    ) {}

    public function execute(Invitation $invitation, string $name, string $password): User
    {
        if (! $invitation->isPending()) {
            throw BusinessRuleException::conflict("This invitation is {$invitation->status()}. Ask your institution for a new one.");
        }

        if (! $invitation->institution?->isActive()) {
            throw BusinessRuleException::forbidden('This institution is not accepting new accounts. Contact your institution.');
        }

        if (User::withoutGlobalScope(InstitutionScope::class)->withTrashed()->where('email', $invitation->email)->exists()) {
            throw BusinessRuleException::conflict('An account with this email already exists. Sign in instead.');
        }

        return $this->tenant->runAs($invitation->institution_id, fn (): User => DB::transaction(function () use ($invitation, $name, $password): User {
            $user = match ($invitation->role) {
                UserRole::Student->value => $this->createStudentAccount($invitation, $name, $password),
                default => $this->createStaffAccount($invitation, $name, $password),
            };

            $invitation->forceFill(['accepted_at' => now(), 'accepted_user_id' => $user->id])->save();
            $this->audit->record('invitation.accepted', $invitation, [], ['userId' => $user->id, 'role' => $user->role], $user);

            return $user;
        }));
    }

    private function createStudentAccount(Invitation $invitation, string $name, string $password): User
    {
        $department = Department::query()->where('code', $invitation->department_code)->first()
            ?? throw BusinessRuleException::conflict('The department on this invitation no longer exists. Ask your institution for a new invitation.');

        $student = $this->createStudent->execute(
            StudentData::forSelfRegistration($name, $invitation->email, $password, $department->code),
            $department,
            $invitation->institution_id,
            $department->hod ?? '',
        );

        return $student->user()->firstOrFail();
    }

    private function createStaffAccount(Invitation $invitation, string $name, string $password): User
    {
        if ($invitation->designation_id === null || $invitation->designation()->doesntExist()) {
            throw BusinessRuleException::conflict('The designation on this invitation no longer exists. Ask your institution for a new invitation.');
        }

        return $this->saveStaff->execute(new StaffMemberData(
            name: $name,
            email: $invitation->email,
            role: $invitation->role,
            designationId: $invitation->designation_id,
            departmentCode: (string) $invitation->department_code,
            password: $password,
            phone: null,
            communicationAddress: null,
            permanentAddress: null,
            emergencyContactPerson: null,
            emergencyContactNumber: null,
            biometricId: null,
            experienceYears: null,
            specialization: null,
            image: null,
        ), null, $invitation->institution_id);
    }
}
