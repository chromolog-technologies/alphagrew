<?php

namespace App\Actions\Resumes;

use App\Enums\ResumeStatus;
use App\Events\ResumeUploaded;
use App\Exceptions\BusinessRuleException;
use App\Models\Resume;
use App\Models\Student;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Stage 1 — stores a resume file on the private disk under the student's institution folder,
 * records its SHA-256 (the same file is not uploaded twice) and queues parsing.
 * The first resume becomes the default.
 */
class UploadResumeAction
{
    public function execute(Student $student, UploadedFile $file, string $title): Resume
    {
        $limit = config('ai.resumes.max_per_student');

        if ($student->resumes()->count() >= $limit) {
            throw BusinessRuleException::unprocessable("You can keep up to {$limit} resumes. Delete one to upload another.");
        }

        $hash = hash_file('sha256', $file->getRealPath());

        if ($student->resumes()->where('file_hash', $hash)->exists()) {
            throw BusinessRuleException::unprocessable('You have already uploaded this file.');
        }

        $disk = Storage::disk(config('ai.resumes.disk'));
        $path = $disk->putFileAs(
            "institutions/{$student->institution_id}/students/{$student->id}/resumes",
            $file,
            Str::uuid().'.'.($file->getMimeType() === 'application/pdf' ? 'pdf' : 'docx'),
        );

        return DB::transaction(function () use ($student, $file, $title, $hash, $path): Resume {
            $resume = $student->resumes()->create([
                'institution_id' => $student->institution_id,
                'title' => $title,
                'file_path' => $path,
                'file_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'file_size_bytes' => $file->getSize(),
                'file_hash' => $hash,
                'mime_type' => $file->getMimeType(),
                'status' => ResumeStatus::Parsing,
                'is_default' => ! $student->resumes()->where('is_default', true)->exists(),
            ]);

            ResumeUploaded::dispatch($student->institution_id, $resume->id);

            return $resume;
        });
    }
}
