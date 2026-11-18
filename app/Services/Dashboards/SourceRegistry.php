<?php

namespace App\Services\Dashboards;

use App\Models\CustomFieldDefinition;
use App\Models\CustomModule;
use App\Models\User;
use App\Services\Dashboards\Sources\AttendanceSource;
use App\Services\Dashboards\Sources\CompaniesSource;
use App\Services\Dashboards\Sources\CoursesSource;
use App\Services\Dashboards\Sources\CustomModuleRecordsSource;
use App\Services\Dashboards\Sources\DepartmentsSource;
use App\Services\Dashboards\Sources\ExamsSource;
use App\Services\Dashboards\Sources\MarksSource;
use App\Services\Dashboards\Sources\SemesterResultsSource;
use App\Services\Dashboards\Sources\StudentsSource;
use Illuminate\Support\Collection;

/**
 * The data sources widgets can query, with the current institution's active custom fields.
 */
class SourceRegistry
{
    private const SOURCES = [
        StudentsSource::class,
        AttendanceSource::class,
        MarksSource::class,
        SemesterResultsSource::class,
        ExamsSource::class,
        CompaniesSource::class,
        CoursesSource::class,
        DepartmentsSource::class,
    ];

    /** @var Collection<int, CustomFieldDefinition>|null */
    private ?Collection $definitions = null;

    public function get(string $key): ?DataSource
    {
        foreach (self::SOURCES as $class) {
            $source = new $class;
            if ($source->key() === $key) {
                return $source;
            }
        }

        // Institution-created modules: "module_{id}" (tenant scope applies to the lookup).
        $moduleId = CustomFieldDefinition::moduleIdFromEntity($key);
        $module = $moduleId === null ? null : CustomModule::query()->find($moduleId);

        return $module ? new CustomModuleRecordsSource($module) : null;
    }

    /** @return list<DataSource> */
    public function availableTo(User $user, DashboardScope $scope): array
    {
        if ($scope->level === DashboardScope::NONE) {
            return [];
        }

        $sources = [
            ...array_map(fn (string $class) => new $class, self::SOURCES),
            ...CustomModule::query()->orderBy('sort_order')->orderBy('plural_label')->get()
                ->map(fn (CustomModule $module) => new CustomModuleRecordsSource($module))
                ->all(),
        ];

        return array_values(array_filter($sources, fn (DataSource $source) => $source->allowedFor($user, $scope)));
    }

    /** @return Collection<int, CustomFieldDefinition> */
    public function customFields(): Collection
    {
        return $this->definitions ??= CustomFieldDefinition::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    /** @return array<string, Field> */
    public function catalog(DataSource $source): array
    {
        return $source->catalog($this->customFields());
    }
}
