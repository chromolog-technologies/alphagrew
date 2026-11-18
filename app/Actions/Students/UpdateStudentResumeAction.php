<?php

namespace App\Actions\Students;

use App\Models\Student;

/**
 * Saves a student's resume profile, trimming text and dropping empty list entries.
 */
class UpdateStudentResumeAction
{
    private const LIST_FIELDS = ['links', 'certifications', 'achievements', 'projects', 'experience'];

    private const TEXT_FIELDS = ['headline', 'summary', 'targetRole', 'location', 'uploadedResumeText', 'uploadedResumeFileName'];

    /**
     * @param  array<string, mixed>  $validated  Output of UpdateStudentResumeRequest.
     */
    public function execute(Student $student, array $validated): Student
    {
        $profile = ['template' => $validated['template']];

        foreach (self::TEXT_FIELDS as $field) {
            $profile[$field] = trim((string) ($validated[$field] ?? ''));
        }

        foreach (self::LIST_FIELDS as $field) {
            $profile[$field] = array_values(array_filter(array_map('trim', $validated[$field] ?? [])));
        }

        $profile['lastUpdated'] = now()->toIso8601String();

        $student->update(['resume_profile' => $profile]);

        return $student;
    }
}
