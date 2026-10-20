<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Announcements\SaveAnnouncementRequest;
use App\Models\Announcement;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Announcements. Each write returns the caller's refreshed campus dataset.
 */
class AnnouncementController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->campusData->buildForUser($request->user())['announcements']);
    }

    public function store(SaveAnnouncementRequest $request): JsonResponse
    {
        Announcement::query()->create([
            ...$request->validated(),
            'posted_by' => $request->user()->name,
            'date' => now()->toDateString(),
        ]);

        return $this->datasetResponse($request, 201);
    }

    public function update(SaveAnnouncementRequest $request, Announcement $announcement): JsonResponse
    {
        $announcement->update($request->validated());

        return $this->datasetResponse($request);
    }

    public function destroy(Request $request, Announcement $announcement): JsonResponse
    {
        $announcement->delete();

        return $this->datasetResponse($request);
    }

    private function datasetResponse(Request $request, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $this->campusData->buildForUser($request->user())], $status);
    }
}
