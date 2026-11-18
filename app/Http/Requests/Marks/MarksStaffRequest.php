<?php

namespace App\Http\Requests\Marks;

use App\Enums\UserRole;
use Illuminate\Auth\Access\Response;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Base for the staff side of marks (entry, review, publishing). Students hold marks.view
 * for their own results, which must not open institution-wide mark sheets.
 */
abstract class MarksStaffRequest extends FormRequest
{
    public function authorize(): Response
    {
        return $this->user()->roleEnum() === UserRole::Student
            ? Response::deny('Students can only view their own published results.')
            : Response::allow();
    }

    /** Records named by id in the input load like route-model binding: missing or another institution's → 404. */
    protected function findOrFail(string $model, string $key): mixed
    {
        return $model::query()->findOrFail((int) $this->input($key));
    }
}
