<?php

namespace App\Services\Skills;

use App\Models\Skill;
use App\Support\Campus\SkillCatalog;
use Illuminate\Support\Collection;

/**
 * Turns free-text skill names ("ReactJS", "c++") into catalogue skills.
 * Order: platform skill by name or alias → the institution's own skill → a new
 * institution skill flagged needs_review. Works with or without a tenant context.
 */
class SkillResolver
{
    /** @var array<int, array<string, int>> institutionId => lookup key => skill id */
    private array $index = [];

    public function resolve(string $name, int $institutionId): ?Skill
    {
        $key = SkillCatalog::key($name);

        if ($key === '') {
            return null;
        }

        $index = $this->indexFor($institutionId);

        if (isset($index[$key])) {
            return $this->query()->find($index[$key]);
        }

        $skill = $this->query()->create([
            'institution_id' => $institutionId,
            'name' => trim($name),
            'slug' => SkillCatalog::slug($name),
            'lookup_key' => $key,
            'category' => 'domain',
            'aliases' => [],
            'needs_review' => true,
        ]);

        $this->index[$institutionId][$key] = $skill->id;

        return $skill;
    }

    /**
     * @param  list<string>  $names
     * @return Collection<int, Skill> unique skills
     */
    public function resolveMany(array $names, int $institutionId): Collection
    {
        return collect($names)
            ->map(fn (string $name) => $this->resolve($name, $institutionId))
            ->filter()
            ->unique('id')
            ->values();
    }

    /** @return array<string, int> */
    private function indexFor(int $institutionId): array
    {
        if (isset($this->index[$institutionId])) {
            return $this->index[$institutionId];
        }

        $skills = $this->query()
            ->where(fn ($query) => $query->whereNull('institution_id')->orWhere('institution_id', $institutionId))
            ->orderByRaw('institution_id is null desc') // platform names win over institution duplicates
            ->get(['id', 'lookup_key', 'aliases']);

        $index = [];
        foreach ($skills as $skill) {
            $index[$skill->lookup_key] ??= $skill->id;
            foreach ($skill->aliases ?? [] as $alias) {
                $index[SkillCatalog::key($alias)] ??= $skill->id;
            }
        }

        return $this->index[$institutionId] = $index;
    }

    private function query()
    {
        return Skill::withoutGlobalScope('platform_or_institution');
    }
}
