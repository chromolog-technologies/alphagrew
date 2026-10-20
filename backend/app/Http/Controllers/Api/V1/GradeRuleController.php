<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marks\SaveGradeRuleRequest;
use App\Http\Resources\GradeRuleResource;
use App\Models\GradeRule;
use App\Support\Tenancy\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * The institution's grading scale (Academic Results spec §4 Stage 1).
 */
class GradeRuleController extends Controller
{
    /** GET /grade-rules — highest band first. */
    public function index(): AnonymousResourceCollection
    {
        return GradeRuleResource::collection(GradeRule::query()->orderByDesc('max_score')->orderBy('sort_order')->get());
    }

    /** GET /grade-rules/{gradeRule} */
    public function show(GradeRule $gradeRule): GradeRuleResource
    {
        return new GradeRuleResource($gradeRule);
    }

    /** POST /grade-rules */
    public function store(SaveGradeRuleRequest $request): JsonResponse
    {
        $rule = GradeRule::query()->create($request->attributesForModel());

        return response()->json(['data' => new GradeRuleResource($rule)], 201);
    }

    /** PUT /grade-rules/{gradeRule} — applies to marks graded from now on. */
    public function update(SaveGradeRuleRequest $request, GradeRule $gradeRule): GradeRuleResource
    {
        $gradeRule->update($request->attributesForModel());

        return new GradeRuleResource($gradeRule);
    }

    /** DELETE /grade-rules/{gradeRule} — removed outright so the score band can be reused. */
    public function destroy(GradeRule $gradeRule): Response
    {
        $gradeRule->forceDelete();

        return response()->noContent();
    }

    /** POST /grade-rules/setup-defaults — replaces the institution's scale with the default 10-point one. */
    public function setupDefaults(Tenant $tenant): AnonymousResourceCollection
    {
        if (! $tenant->scopes()) {
            throw BusinessRuleException::unprocessable('Grade rules belong to an institution; sign in as one of its users.');
        }

        DB::transaction(function (): void {
            GradeRule::query()->withTrashed()->forceDelete();

            foreach (GradeRule::defaults() as $index => $rule) {
                GradeRule::query()->create([...$rule, 'sort_order' => $index + 1]);
            }
        });

        return $this->index();
    }
}
