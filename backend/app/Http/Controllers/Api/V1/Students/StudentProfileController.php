<?php

namespace App\Http\Controllers\Api\V1\Students;

use App\Http\Controllers\Controller;
use App\Http\Requests\Students\Me\OwnStudentRequest;
use App\Http\Requests\Students\Me\UpdateStudentProfileRequest;
use App\Http\Requests\Students\Me\UploadProfilePhotoRequest;
use App\Http\Resources\StudentProfileResource;
use App\Models\Student;
use App\Models\StudentProfile;
use App\Services\Students\ProfileCompleteness;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Student Journey step 2: the student's own career profile.
 */
class StudentProfileController extends Controller
{
    public function __construct(private readonly ProfileCompleteness $completeness)
    {
    }

    /** GET /students/me/profile */
    public function show(OwnStudentRequest $request): JsonResponse
    {
        return $this->profileResponse($request->student());
    }

    /** PUT /students/me/profile — fields not sent are left unchanged. */
    public function update(UpdateStudentProfileRequest $request): JsonResponse
    {
        $student = $request->student();

        $this->profileFor($student)->fill($request->profileAttributes())->save();
        $this->completeness->refresh($student);

        return $this->profileResponse($student);
    }

    /** POST /students/me/profile/photo */
    public function uploadPhoto(UploadProfilePhotoRequest $request): JsonResponse
    {
        $student = $request->student();
        $profile = $this->profileFor($student);
        $previous = $profile->photo_path;

        $profile->photo_path = $request->file('photo')->store(
            "institutions/{$student->institution_id}/students/{$student->id}",
            'local'
        );
        $profile->save();

        if ($previous) {
            Storage::disk('local')->delete($previous);
        }

        $this->completeness->refresh($student);

        return $this->profileResponse($student);
    }

    /**
     * GET /files/student-photos/{student} — signed, short-lived URL from photoUrl.
     * Signed rather than token-authenticated so <img> tags can load it.
     */
    public function photo(Student $student): StreamedResponse
    {
        $path = $student->profile?->photo_path;

        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path);
    }

    /** GET /students/{student}/profile — staff view of a student's profile. */
    public function showForStaff(Student $student): JsonResponse
    {
        $this->authorize('view', $student);

        return $this->profileResponse($student);
    }

    private function profileFor(Student $student): StudentProfile
    {
        return $student->profile ?? new StudentProfile([
            'student_id' => $student->id,
            'institution_id' => $student->institution_id,
        ]);
    }

    private function profileResponse(Student $student): JsonResponse
    {
        $student->unsetRelation('profile');

        return response()->json(['data' => new StudentProfileResource($student)]);
    }
}
