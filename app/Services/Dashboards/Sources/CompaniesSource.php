<?php

namespace App\Services\Dashboards\Sources;

use App\Models\Company;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use App\Support\Campus\CampusMasterCatalog;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Builder;

/**
 * Company drives. Drives are listed to everyone with placement access in the institution,
 * so every dashboard scope sees all of them.
 */
class CompaniesSource extends DataSource
{
    public function key(): string
    {
        return 'companies';
    }

    public function label(): string
    {
        return 'Companies & drives';
    }

    public function description(): string
    {
        return 'One row per company drive: role, status, type, location, drive date and applicant counts.';
    }

    protected function baseQuery(): Builder
    {
        return Company::query();
    }

    protected function primaryKey(): string
    {
        return 'companies.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('name', 'Company', Field::STRING, 'companies.name'),
            Field::dimension('role', 'Role', Field::STRING, 'companies.role'),
            Field::dimension('status', 'Status', Field::STRING, 'companies.status', [], CampusMasterCatalog::optionsFor(CampusMasterCatalog::COMPANY_DRIVE_STATUS)),
            Field::dimension('type', 'Drive type', Field::STRING, 'companies.type', [], CampusMasterCatalog::optionsFor(CampusMasterCatalog::COMPANY_DRIVE_TYPE)),
            Field::dimension('location', 'Location', Field::STRING, 'companies.location'),
            Field::dimension('package_offered', 'Package offered', Field::STRING, 'companies.package_offered'),
            Field::dimension('drive_date', 'Drive date', Field::DATE, 'companies.drive_date'),
            Field::number('applicants', 'Applicants', 'companies.applicants'),
            Field::number('shortlisted', 'Shortlisted', 'companies.shortlisted'),
        ];
    }

    protected function joins(): array
    {
        return [];
    }

    protected function customFieldEntities(): array
    {
        return ['company' => 'companies.id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        if ($scope->level === DashboardScope::NONE) {
            $this->none($query);
        }
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $user->can(CampusPermission::PLACEMENT_VIEW);
    }
}
