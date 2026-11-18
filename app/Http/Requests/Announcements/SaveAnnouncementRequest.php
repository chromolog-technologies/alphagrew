<?php

namespace App\Http\Requests\Announcements;

use App\Support\Campus\CampusMasterCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create and update an announcement. Only admins may target the "admin" audience.
 */
class SaveAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Module permission (announcements.create) is enforced by route middleware.
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'summary' => ['required', 'string', 'max:1000'],
            'audience' => ['required', Rule::in($this->allowedAudiences())],
            'priority' => ['required', Rule::in(CampusMasterCatalog::optionsFor(CampusMasterCatalog::ANNOUNCEMENT_PRIORITY))],
            'category' => ['required', 'string', 'max:100'],
        ];
    }

    /**
     * @return list<string>
     */
    private function allowedAudiences(): array
    {
        $audiences = CampusMasterCatalog::optionsFor(CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE);

        return $this->user()->isAdmin()
            ? $audiences
            : array_values(array_intersect($audiences, ['all', 'students', 'staff']));
    }
}
