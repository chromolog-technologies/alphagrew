<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Institutions\UpdateInstitutionSettingsRequest;
use App\Http\Requests\Institutions\UploadInstitutionLogoRequest;
use App\Http\Resources\InstitutionResource;
use App\Models\Institution;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;

/**
 * The signed-in user's institution: profile, contact details and branding (plan S2-2).
 * Always the caller's own institution; there is no id in the URL to tamper with.
 */
class InstitutionSettingsController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function show(Request $request): InstitutionResource
    {
        return new InstitutionResource($this->institutionOf($request));
    }

    public function update(UpdateInstitutionSettingsRequest $request): InstitutionResource
    {
        $institution = $this->institutionOf($request);
        $before = ['name' => $institution->name, ...Arr::only($institution->settings ?? [], UpdateInstitutionSettingsRequest::SETTINGS)];

        $institution->update([
            'name' => $request->validated('name'),
            'settings' => [
                ...($institution->settings ?? []),
                ...Arr::only($request->validated(), UpdateInstitutionSettingsRequest::SETTINGS),
            ],
        ]);

        $after = ['name' => $institution->name, ...Arr::only($institution->settings, UpdateInstitutionSettingsRequest::SETTINGS)];
        $this->audit->record('institution.settings_updated', $institution, array_diff_assoc($before, $after), array_diff_assoc($after, $before));

        return new InstitutionResource($institution);
    }

    public function uploadLogo(UploadInstitutionLogoRequest $request): InstitutionResource
    {
        $institution = $this->institutionOf($request);
        $previous = $institution->settings['logoPath'] ?? null;

        $path = $request->file('logo')->store("institution-logos/{$institution->id}", 'public');
        $institution->update(['settings' => [...($institution->settings ?? []), 'logoPath' => $path]]);

        if ($previous && $previous !== $path) {
            Storage::disk('public')->delete($previous);
        }
        $this->audit->record('institution.logo_updated', $institution);

        return new InstitutionResource($institution);
    }

    private function institutionOf(Request $request): Institution
    {
        return Institution::query()->findOrFail($request->user()->institution_id ?? 0);
    }
}
