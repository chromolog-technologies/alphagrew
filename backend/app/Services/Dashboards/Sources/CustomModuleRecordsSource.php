<?php

namespace App\Services\Dashboards\Sources;

use App\Models\CustomModule;
use App\Models\CustomModuleRecord;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DataSource;
use App\Services\Dashboards\Field;
use Illuminate\Database\Eloquent\Builder;

/**
 * The records of one institution-created module (source key "module_{id}"). Access follows
 * the module's own view access; within it, every scope sees all of the module's records.
 */
class CustomModuleRecordsSource extends DataSource
{
    public function __construct(private readonly CustomModule $module) {}

    public function key(): string
    {
        return $this->module->customFieldEntity();
    }

    public function label(): string
    {
        return $this->module->plural_label;
    }

    public function description(): string
    {
        return $this->module->description ?: "One row per {$this->module->singular_label} record, with its custom fields.";
    }

    protected function baseQuery(): Builder
    {
        return CustomModuleRecord::query()->where('custom_module_records.custom_module_id', $this->module->id);
    }

    protected function primaryKey(): string
    {
        return 'custom_module_records.id';
    }

    protected function fields(): array
    {
        return [
            Field::dimension('title', $this->module->singular_label, Field::STRING, 'custom_module_records.title'),
            Field::dimension('status', 'Status', Field::STRING, 'custom_module_records.status', [], CustomModuleRecord::STATUSES),
            Field::dimension('created_at', 'Created', Field::DATE, 'custom_module_records.created_at'),
        ];
    }

    protected function joins(): array
    {
        return [];
    }

    protected function customFieldEntities(): array
    {
        return [$this->module->customFieldEntity() => 'custom_module_records.id'];
    }

    protected function applyScope(Builder $query, DashboardScope $scope): void
    {
        if ($scope->level === DashboardScope::NONE) {
            $this->none($query);
        }
    }

    public function allowedFor(User $user, DashboardScope $scope): bool
    {
        return $this->module->canView($user);
    }
}
