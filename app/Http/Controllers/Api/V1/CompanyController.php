<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Placement\ApplyToCompanyAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\SaveCompanyRequest;
use App\Models\Company;
use App\Models\CompanyApplication;
use App\Models\CustomFieldDefinition;
use App\Models\JobPosting;
use App\Services\Campus\CampusDataService;
use App\Services\CustomFields\CustomFieldService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Company drives. Each response returns the caller's refreshed campus dataset.
 */
class CompanyController extends Controller
{
    public function __construct(
        private readonly CampusDataService $campusData,
        private readonly CustomFieldService $customFields,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->campusData->buildForUser($request->user())['companies']);
    }

    public function store(SaveCompanyRequest $request): JsonResponse
    {
        DB::transaction(function () use ($request): void {
            $company = Company::query()->create([
                ...$request->companyAttributes(),
                'applicants' => 0,
                'shortlisted' => 0,
            ]);
            $this->customFields->save($company, CustomFieldDefinition::ENTITY_COMPANY, $request->customFields());
        });

        return $this->datasetResponse($request, 201);
    }

    public function update(SaveCompanyRequest $request, Company $company): JsonResponse
    {
        DB::transaction(function () use ($request, $company): void {
            $company->update($request->companyAttributes());
            $this->customFields->save($company, CustomFieldDefinition::ENTITY_COMPANY, $request->customFields());
        });

        return $this->datasetResponse($request);
    }

    public function destroy(Request $request, Company $company): JsonResponse
    {
        CompanyApplication::query()->where('company_id', $company->id)->delete();
        // Its open jobs stop taking applications; their history is kept.
        JobPosting::query()->where('company_id', $company->id)->where('status', '!=', 'closed')->update(['status' => 'closed']);
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
