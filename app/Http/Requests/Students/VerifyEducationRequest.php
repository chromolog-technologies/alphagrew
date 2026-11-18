<?php

namespace App\Http\Requests\Students;

use App\Models\Student;
use App\Models\StudentAcademic;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * Staff verify (or reject) a student's prior-education record against documents.
 */
class VerifyEducationRequest extends FormRequest
{
    public function authorize(): Response
    {
        abort_unless($this->educationRecord()->student_id === $this->studentRecord()->id, 404);

        return Gate::inspect('manage', $this->studentRecord());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'verified' => ['required', 'boolean'],
            'remarks' => ['nullable', 'string', 'max:255', 'required_if:verified,false'],
        ];
    }

    public function studentRecord(): Student
    {
        return $this->route('student');
    }

    public function educationRecord(): StudentAcademic
    {
        return $this->route('education');
    }
}
