<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\MarkStatus;
use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Marks\SaveMarkSchemeRequest;
use App\Http\Resources\MarkSchemeResource;
use App\Models\MarkScheme;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * Internal / external / total maximum and pass marks per subject and semester
 * (Academic Results spec §4 Stage 1).
 */
class MarkSchemeController extends Controller
{
    /** GET /mark-schemes?semesterId=&subjectId= */
    public function index(Request $request): AnonymousResourceCollection
    {
        $schemes = MarkScheme::query()
            ->with(['subject', 'semester'])
            ->when($request->integer('semesterId'), fn ($query, int $id) => $query->where('semester_id', $id))
            ->when($request->integer('subjectId'), fn ($query, int $id) => $query->where('subject_id', $id))
            ->orderBy('semester_id')
            ->orderBy('subject_id')
            ->paginate(min($request->integer('perPage', 50), 200));

        return MarkSchemeResource::collection($schemes);
    }

    /** GET /mark-schemes/{markScheme} */
    public function show(MarkScheme $markScheme): MarkSchemeResource
    {
        return new MarkSchemeResource($markScheme->load(['subject', 'semester']));
    }

    /** POST /mark-schemes */
    public function store(SaveMarkSchemeRequest $request): JsonResponse
    {
        $scheme = MarkScheme::query()->create($request->attributesForModel());

        return response()->json(['data' => new MarkSchemeResource($scheme->load(['subject', 'semester']))], 201);
    }

    /** PUT /mark-schemes/{markScheme} — only while its marks are still drafts. */
    public function update(SaveMarkSchemeRequest $request, MarkScheme $markScheme): MarkSchemeResource
    {
        if ($markScheme->markEntries()->where('status', '!=', MarkStatus::Draft->value)->exists()) {
            throw BusinessRuleException::unprocessable('Marks under review or published use this scheme; it cannot be changed.');
        }

        $markScheme->update($request->attributesForModel());

        return new MarkSchemeResource($markScheme->load(['subject', 'semester']));
    }

    /** DELETE /mark-schemes/{markScheme} — only while no marks use it. */
    public function destroy(MarkScheme $markScheme): Response
    {
        if ($markScheme->markEntries()->exists()) {
            throw BusinessRuleException::unprocessable('Marks have been entered against this scheme; it cannot be deleted.');
        }

        $markScheme->forceDelete();

        return response()->noContent();
    }
}
