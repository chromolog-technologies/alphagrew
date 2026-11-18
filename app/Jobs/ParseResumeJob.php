<?php

namespace App\Jobs;

use App\Actions\Resumes\SyncResumeSkillsAction;
use App\Enums\ResumeStatus;
use App\Events\ResumeParsed;
use App\Models\Resume;
use App\Services\Resumes\ResumeParser;
use App\Support\Tenancy\Tenant;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * Stage 2 — extracts text, structures it, upserts resume skills, then fires ResumeParsed.
 * Any failure leaves the resume in status failed with a reason the student can act on.
 */
class ParseResumeJob implements ShouldQueue
{
    use Queueable;

    /** Below this many characters the file is treated as unreadable (e.g. a scanned PDF). */
    private const MIN_TEXT_LENGTH = 80;

    public function __construct(public readonly int $institutionId, public readonly int $resumeId)
    {
    }

    public function handle(Tenant $tenant, ResumeParser $parser, SyncResumeSkillsAction $syncSkills): void
    {
        $tenant->runAs($this->institutionId, function () use ($parser, $syncSkills): void {
            $resume = Resume::query()->with('student:id,user_id')->find($this->resumeId);

            if (! $resume) {
                return;
            }

            $resume->update(['status' => ResumeStatus::Parsing, 'parse_error' => null]);

            try {
                $text = $parser->extractText(Storage::disk(config('ai.resumes.disk'))->get($resume->file_path) ?? '', $resume->mime_type);

                if (mb_strlen($text) < self::MIN_TEXT_LENGTH) {
                    throw new RuntimeException('No readable text found. Scanned (image-only) PDFs are not supported yet; upload a text-based PDF or a DOCX.');
                }

                $resume->update([
                    'parsed_text' => $text,
                    'parsed_data' => $parser->structure($text, $resume, $resume->student?->user_id),
                    'status' => ResumeStatus::Parsed,
                ]);
            } catch (Throwable $e) {
                $resume->update(['status' => ResumeStatus::Failed, 'parse_error' => mb_substr($e->getMessage(), 0, 255)]);
                report($e);

                return;
            }

            $syncSkills->execute($resume);
            ResumeParsed::dispatch($this->institutionId, $resume->id);
        });
    }
}
