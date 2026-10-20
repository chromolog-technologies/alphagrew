<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Placement\ApplyToCompanyAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\SaveCompanyRequest;
use App\Models\Company;
use App\Models\CompanyApplication;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Company drives. Each response returns the caller's refreshed campus dataset.
 */
class CompanyController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->campusData->buildForUser($request->user())['companies']);
    }

    public function store(SaveCompanyRequest $request): JsonResponse
    {
        Company::query()->create([
            ...$request->companyAttributes(),
            'applicants' => 0,
            'shortlisted' => 0,
        ]);

        return $this->datasetResponse($request, 201);
    }

    public function update(SaveCompanyRequest $request, Company $company): JsonResponse
    {
        $company->update($request->companyAttributes());

        return $this->datasetResponse($request);
    }

    public function destroy(Request $request, Company $company): JsonResponse
    {
        CompanyApplication::query()->where('company_id', $company->id)->delete();
        $company->delete();

        return $this->datasetResponse($request);
    }

    public function apply(Request $request, Company $company, ApplyToCompanyAction $applyToCompany): JsonResponse
    {
        $applyToCompany->execute($request->user(), $company);

        return $this->datasetResponse($request);
    }

    private function datasetResponse(Request $request, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $this->campusData->buildForUser($request->user())], $status);
    }
}
