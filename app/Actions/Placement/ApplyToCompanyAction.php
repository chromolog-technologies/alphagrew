<?php

namespace App\Actions\Placement;

use App\Exceptions\BusinessRuleException;
use App\Models\Company;
use App\Models\JobPosting;
use App\Models\User;
use App\Support\Campus\CampusPermission;
use App\Support\Placement\LegacyCompanyImporter;

/**
 * Legacy entry point (`POST /companies/{company}/apply`, used by the offline-era screens):
 * applies to the company's job on the job-posting model, so the same eligibility rules and
 * placement policies apply. Applying twice is a no-op.
 */
class ApplyToCompanyAction
{
    public function __construct(private readonly ApplyToJobAction $apply)
    {
    }

    public function execute(User $user, Company $company): void
    {
        if (! $user->can(CampusPermission::PLACEMENT_APPLY)) {
            throw BusinessRuleException::forbidden('You do not have permission to apply to company drives.');
        }

        if (! $user->student) {
            throw BusinessRuleException::forbidden('A linked student profile is required before applying.');
        }

        $this->apply->execute($user, $this->jobFor($company));
    }

    private function jobFor(Company $company): JobPosting
    {
        $find = fn () => JobPosting::query()
            ->where(fn ($query) => $query->where('legacy_company_id', $company->id)->orWhere('company_id', $company->id))
            ->orderByRaw("case status when 'open' then 0 when 'draft' then 1 else 2 end")
            ->latest('id')
            ->first();

        $job = $find();

        if (! $job) {
            // A company created through the old screens after the last import.
            (new LegacyCompanyImporter())->import();
            $job = $find();
        }

        return $job ?? throw BusinessRuleException::unprocessable('This drive has no job to apply to yet.');
    }
}
