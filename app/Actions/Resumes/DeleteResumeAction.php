<?php

namespace App\Actions\Resumes;

use App\Models\Resume;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Deletes a resume, its file and its analysis. If it was the default, the newest remaining
 * resume becomes the default. Interviews keep running without it (resume_id set null).
 */
class DeleteResumeAction
{
    public function execute(Resume $resume): void
    {
        DB::transaction(function () use ($resume): void {
            $resume->delete();

            if ($resume->is_default) {
                Resume::query()
                    ->where('student_id', $resume->student_id)
                    ->latest('id')
                    ->first()
                    ?->update(['is_default' => true]);
            }
        });

        Storage::disk(config('ai.resumes.disk'))->delete($resume->file_path);
    }
}
