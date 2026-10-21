<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Students\CreateStudentAction;
use App\Actions\Students\DeleteStudentAction;
use App\Actions\Students\UpdateStudentAction;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Students\ListStudentsRequest;
use App\Http\Requests\Students\StoreStudentRequest;
use App\Http\Requests\Students\UpdateStudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\Department;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use App\Repositories\StudentRepository;
use App\Services\Campus\CampusDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class StudentController extends Controller
{
    public function __construct(private readonly CampusDataService $campusData)
    {
    }

    /**
     * GET /students?page=&per_page= — the students visible to the caller, one page at a time.
     */
    public function index(ListStudentsRequest $request, StudentRepository $students): JsonResponse
    {
        $page = $students->paginateVisibleTo($request->user(), $request->perPage());

        return response()->json([
            'data' => StudentResource::collection($page->getCollection())->resolve($request),
            'meta' => [
                'currentPage' => $page->currentPage(),
                'perPage' => $page->perPage(),
                'total' => $page->total(),
                'lastPage' => $page->lastPage(),
            ],
        ]);
    }

    public function store(StoreStudentRequest $request, CreateStudentAction $createStudent): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $data = $request->toData();

        $department = $this->departmentFor($actor, $data->departmentCode, 'A department is required for new students.');

        $student = $createStudent->execute(
            $data,
            $department,
            Institution::forNewAccountsOf($actor),
            $this->mentorFor($actor, $department),
        );

        return $this->recordResponse($actor, $student, 201);
    }

    public function update(UpdateStudentRequest $request, Student $student, UpdateStudentAction $updateStudent): JsonResponse
    {
        /** @var User $actor */
        $actor = $request->user();
        $data = $request->toData();

        $department = $this->departmentFor(
            $actor,
            $data->departmentCode ?? $student->department_code,
            'A department is required for this student.',
        );

        $updateStudent->execute($student, $data, $department, $this->mentorFor($actor, $department));

        return $this->recordResponse($actor, $student);
    }

    public function destroy(Student $student, DeleteStudentAction $deleteStudent): Response
    {
        $this->authorize('manage', $student);

        $deleteStudent->execute($student);

        return response()->noContent();
    }

    /**
     * Staff always place students in their own department; admins choose one.
     */
    private function departmentFor(User $actor, ?string $requestedCode, string $missingMessage): Department
    {
        $code = $actor->role === UserRole::Staff->value ? $actor->department_code : $requestedCode;

        abort_unless($code, 422, $missingMessage);

        return Department::query()->where('code', $code)->firstOrFail();
    }

    private function mentorFor(User $actor, Department $department): string
    {
        return $actor->role === UserRole::Staff->value ? $actor->name : ($department->hod?->name ?? '');
    }

    /**
     * The changed student plus its login account. The account is only returned to admins,
     * the only role whose dataset lists other users.
     */
    private function recordResponse(User $actor, Student $student, int $status = 200): JsonResponse
    {
        $student->load('applications', 'user', 'studentSkills.skill', 'academicSummary');

        return response()->json([
            'student' => new StudentResource($student),
            'user' => $actor->isAdmin() && $student->user
                ? $this->campusData->sessionUser($student->user)
                : null,
        ], $status);
    }
}
