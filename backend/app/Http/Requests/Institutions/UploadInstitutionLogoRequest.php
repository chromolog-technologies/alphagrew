<?php

namespace App\Http\Requests\Institutions;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class UploadInstitutionLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->institution_id !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // Raster images only: SVG can carry scripts and the logo is served publicly.
        return [
            'logo' => ['required', File::image()->types(['png', 'jpg', 'jpeg', 'webp'])->max(1024)->dimensions(
                Rule::dimensions()->maxWidth(2000)->maxHeight(2000)
            )],
        ];
    }
}
