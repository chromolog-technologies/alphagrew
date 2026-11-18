<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\SaveStudentProjectRequest;
use App\Http\Resources\StudentProjectResource;
use App\Models\Student;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/** /students/me/projects */
class StudentProjectController extends StudentProfileItemController
{
    public function index(OwnStudentRequest $request): JsonResponse
    {
        return $this->listItems($request);
    }

    public function store(SaveStudentProjectRequest $request): JsonResponse
    {
        return $this->createItem($request, $request->attributesForModel());
    }

    public function update(SaveStudentProjectRequest $request): JsonResponse
    {
        return $this->updateItem($request, 'project', $request->attributesForModel());
    }

    public function destroy(OwnStudentRequest $request): Response
    {
        return $this->deleteItem($request, 'project');
    }

    protected function items(Student $student): HasMany
    {
        return $student->projects();
    }

    protected function resourceClass(): string
    {
        return StudentProjectResource::class;
    }
}
