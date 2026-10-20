<?php

namespace App\Http\Requests\Students\Me;

use App\Services\Resumes\ResumeParser;

/**
 * POST /students/me/resumes — multipart file (PDF or DOCX, ≤ 5 MB) and a title. The type is
 * checked from the file content (mimetypes uses finfo), not the extension.
 */
class StoreResumeRequest extends StudentSelfRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:'.config('ai.resumes.max_kb'), 'mimetypes:application/pdf,'.ResumeParser::DOCX],
            'title' => ['required', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return ['file.mimetypes' => 'Upload a PDF or Word (.docx) file.'];
    }
}
