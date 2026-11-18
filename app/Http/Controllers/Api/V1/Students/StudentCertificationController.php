<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\SaveStudentCertificationRequest;
use App\Http\Resources\StudentCertificationResource;
use App\Models\Student;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/** /students/me/certifications */
class StudentCertificationController extends StudentProfileItemController
{
    public function index(OwnStudentRequest $request): JsonResponse
    {
        return $this->listItems($request);
    }

    public function store(SaveStudentCertificationRequest $request): JsonResponse
    {
        return $this->createItem($request, $request->attributesForModel());
    }

    public function update(SaveStudentCertificationRequest $request): JsonResponse
    {
        return $this->updateItem($request, 'certification', $request->attributesForModel());
    }

    public function destroy(OwnStudentRequest $request): Response
    {
        return $this->deleteItem($request, 'certification');
    }

    protected function items(Student $student): HasMany
    {
        return $student->certifications();
    }

    protected function resourceClass(): string
    {
        return StudentCertificationResource::class;
    }
}
