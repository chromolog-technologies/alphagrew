<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Campus\CampusDataService;
use Database\Seeders\CampusDemoSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Campus-wide endpoints: the initial dataset, the demo reset and the summary report.
 * Resource CRUD lives in StudentController, StaffController, CompanyController,
 * AnnouncementController and MasterOptionController.
 */
class CampusController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData)
    {
    }

    public function bootstrap(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->campusData->authenticatedUser($user),
            'data' => $this->campusData->buildForUser($user),
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        abort_unless(config('app.demo_reset_enabled'), 403, 'Demo reset is disabled in this environment.');

        Artisan::call('db:seed', [
            '--class' => CampusDemoSeeder::class,
            '--force' => true,
        ]);

        $user = User::query()
            ->with('student:id,user_id')
            ->findOrFail($request->user()->id);

        return response()->json([
            'user' => $this->campusData->authenticatedUser($user),
            'data' => $this->campusData->buildForUser($user),
        ]);
    }

    public function summary(Request $request): JsonResponse
    {
        return response()->json($this->campusData->summaryForUser($request->user()));
    }
}
