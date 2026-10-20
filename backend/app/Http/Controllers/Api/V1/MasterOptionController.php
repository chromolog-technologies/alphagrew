<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterOptions\StoreMasterOptionRequest;
use App\Http\Requests\MasterOptions\UpdateMasterOptionRequest;
use App\Models\MasterOption;
use App\Models\User;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Campus master options (dropdown values such as student year, gender, drive status). Admin only.
 */
class MasterOptionController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdmin($request->user());

        return response()->json($this->campusData->buildForUser($request->user())['masters']);
    }

    public function store(StoreMasterOptionRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $code = Str::slug($payload['label'], '_');

        abort_if(
            MasterOption::query()->where('category', $payload['category'])->where('code', $code)->exists(),
            422,
            'A master option with this label already exists in the selected category.'
        );

        MasterOption::query()->create([
            'category' => $payload['category'],
            'code' => $code,
            'label' => trim($payload['label']),
            'description' => $payload['description'] ?? null,
            'sort_order' => $payload['sortOrder'] ?? 1,
        ]);

        return $this->datasetResponse($request, 201);
    }

    public function update(UpdateMasterOptionRequest $request, MasterOption $master): JsonResponse
    {
        $payload = $request->validated();

        $master->update([
            'label' => trim($payload['label']),
            'description' => $payload['description'] ?? null,
            'sort_order' => $payload['sortOrder'] ?? $master->sort_order,
        ]);

        return $this->datasetResponse($request);
    }

    public function destroy(Request $request, MasterOption $master): JsonResponse
    {
        $this->ensureAdmin($request->user());

        abort_if(
            $master->usageCount() > 0,
            422,
            'This master option is still used by campus records. Update those records before deleting it.'
        );

        $master->delete();

        return $this->datasetResponse($request);
    }

    private function ensureAdmin(User $user): void
    {
        abort_unless($user->isAdmin(), 403, 'Only admins can manage campus masters.');
    }

    private function datasetResponse(Request $request, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $this->campusData->buildForUser($request->user())], $status);
    }
}
