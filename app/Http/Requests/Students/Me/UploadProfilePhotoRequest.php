<?php

namespace App\Http\Requests\Students\Me;

class UploadProfilePhotoRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // mimes checks the file content, not just the extension.
            'photo' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:2048', 'dimensions:min_width=100,min_height=100'],
        ];
    }
}
