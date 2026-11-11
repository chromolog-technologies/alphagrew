<?php

namespace App\Services\Dashboards;

use App\Models\CustomFieldDefinition;
use App\Models\User;
use App\Services\Dashboards\Sources\AttendanceSource;
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

        return null;
    }

    /** @return list<DataSource> */
    public function availableTo(User $user, DashboardScope $scope): array
    {
        if ($scope->level === DashboardScope::NONE) {
            return [];
        }

        return array_values(array_filter(
            array_map(fn (string $class) => new $class, self::SOURCES),
            fn (DataSource $source) => $source->allowedFor($user, $scope),
        ));
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
