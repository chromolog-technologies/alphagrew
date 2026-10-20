<?php

namespace App\Actions\Placement;

use App\Exceptions\BusinessRuleException;
use App\Models\Company;
use App\Models\CompanyApplication;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use Illuminate\Support\Facades\DB;

/**
 * Applies the signed-in student to a company drive. Applying twice is a no-op.
 */
class ApplyToCompanyAction
{
    public function execute(User $user, Company $company): void
    {
        if (! $user->can(CampusPermission::PLACEMENT_APPLY)) {
            throw BusinessRuleException::forbidden('You do not have permission to apply to company drives.');
        }

        $student = $user->student;

        if (! $student) {
            throw BusinessRuleException::forbidden('A linked student profile is required before applying.');
        }

        if (! in_array($student->department_code, $company->eligible_departments ?? [], true)) {
            throw BusinessRuleException::forbidden('You are not eligible for this drive.');
        }

        if ($company->status === 'closed') {
            throw BusinessRuleException::unprocessable('This drive is already closed.');
        }

        DB::transaction(function () use ($student, $company): void {
            $application = CompanyApplication::query()->firstOrCreate([
                'student_id' => $student->id,
                'company_id' => $company->id,
            ]);

            if ($application->wasRecentlyCreated) {
                $company->increment('applicants');
            }
        });
    }
}
