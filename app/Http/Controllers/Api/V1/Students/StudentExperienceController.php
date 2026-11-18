<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\SaveStudentExperienceRequest;
use App\Http\Resources\StudentExperienceResource;
use App\Models\Student;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/** /students/me/experience */
class StudentExperienceController extends StudentProfileItemController
{
    public function index(OwnStudentRequest $request): JsonResponse
    {
        return $this->listItems($request);
    }

    public function store(SaveStudentExperienceRequest $request): JsonResponse
    {
        return $this->createItem($request, $request->attributesForModel());
    }

    public function update(SaveStudentExperienceRequest $request): JsonResponse
    {
        return $this->updateItem($request, 'experience', $request->attributesForModel());
    }

    public function destroy(OwnStudentRequest $request): Response
    {
        return $this->deleteItem($request, 'experience');
    }

    protected function items(Student $student): HasMany
    {
        return $student->experience();
    }

    protected function resourceClass(): string
    {
        return StudentExperienceResource::class;
    }
}
