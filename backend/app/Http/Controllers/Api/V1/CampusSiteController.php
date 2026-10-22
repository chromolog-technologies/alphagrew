<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\BusinessRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Campuses\SaveCampusRequest;
use App\Http\Resources\CampusResource;
use App\Models\Campus;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Physical campuses of the institution (plan S2-2). Named CampusSiteController because
 * CampusController serves the campus dataset (bootstrap, demo reset).
 */
class CampusSiteController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(): AnonymousResourceCollection
    {
        return CampusResource::collection(Campus::query()->orderByDesc('is_primary')->orderBy('name')->get());
    }

    public function store(SaveCampusRequest $request): JsonResponse
    {
        $campus = DB::transaction(function () use ($request): Campus {
            // The first campus is always the primary one.
            $primary = $request->boolean('isPrimary') || Campus::query()->doesntExist();
            $campus = Campus::query()->create([...$request->attributesForModel(), 'is_primary' => $primary]);
            $primary && $this->makeOnlyPrimary($campus);

            return $campus;
        });
        $this->audit->record('campus.created', $campus, [], $campus->only(['code', 'name', 'is_primary']));

        return (new CampusResource($campus))->response()->setStatusCode(201);
    }

    public function update(SaveCampusRequest $request, Campus $campus): CampusResource
    {
        if ($campus->is_primary && $request->has('isPrimary') && ! $request->boolean('isPrimary')) {
            throw BusinessRuleException::unprocessable('Make another campus primary instead of unsetting this one.');
        }

        $before = $campus->only(['code', 'name', 'is_primary']);
        DB::transaction(function () use ($request, $campus): void {
            $campus->update($request->attributesForModel());
            if ($request->boolean('isPrimary') && ! $campus->is_primary) {
                $this->makeOnlyPrimary($campus);
            }
        });
        $this->audit->record('campus.updated', $campus, $before, $campus->fresh()->only(array_keys($before)));

        return new CampusResource($campus->fresh());
    }

    public function destroy(Campus $campus): JsonResponse
    {
        if ($campus->is_primary && Campus::query()->whereKeyNot($campus->id)->exists()) {
            throw BusinessRuleException::conflict('Make another campus primary before deleting this one.');
        }

        $campus->delete();
        $this->audit->record('campus.deleted', $campus, $campus->only(['code', 'name']));

        return response()->json(['message' => 'Campus deleted.']);
    }

    private function makeOnlyPrimary(Campus $campus): void
    {
        Campus::query()->whereKeyNot($campus->id)->update(['is_primary' => false]);
        $campus->forceFill(['is_primary' => true])->save();
    }
}
