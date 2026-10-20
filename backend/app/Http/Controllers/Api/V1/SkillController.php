<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Skills\SearchSkillsRequest;
use App\Http\Resources\SkillResource;
use App\Models\Skill;
use App\Support\Campus\SkillCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

/**
 * GET /skills?search=&category=&limit= — catalogue search for skill pickers.
 * Returns platform skills plus the caller's institution's own.
 */
class SkillController extends Controller
{
    public function index(SearchSkillsRequest $request): JsonResponse
    {
        $search = trim((string) $request->validated('search'));
        $key = SkillCatalog::key($search);

        $skills = Skill::query()
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('lookup_key', 'like', "{$key}%")
                ->orWhere('aliases', 'like', '%'.addcslashes($search, '%_').'%')))
            ->when($request->validated('category'), fn (Builder $query, string $category) => $query->where('category', $category))
            ->where('needs_review', false)
            ->orderByRaw('lookup_key = ? desc', [$key])
            ->orderBy('name')
            ->limit((int) ($request->validated('limit') ?? 20))
            ->get();

        return response()->json(['data' => SkillResource::collection($skills)]);
    }
}
