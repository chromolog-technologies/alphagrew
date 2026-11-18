<?php

namespace App\Actions\Placement;

use App\Exceptions\BusinessRuleException;
use App\Models\Company;
use App\Models\JobPosting;
use App\Models\PlacementDrive;
use App\Models\Student;
use App\Models\User;
use App\Notifications\Placement\JobPublished;
use App\Services\Placement\PlacementGate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Jobs on the placement-drive model. A job is saved with its drive (one drive per job in the
 * app) and its company; the company's legacy columns (role, package, drive date, status,
 * eligible departments) mirror its latest job so the older screens and the offline dataset stay
 * in step. Publishing notifies every student who can apply.
 */
class JobPostingActions
{
    public function __construct(private readonly PlacementGate $gate)
    {
    }

    /** @param array<string, mixed> $data validated SaveJobPostingRequest data */
    public function save(User $actor, ?JobPosting $job, array $data): JobPosting
    {
        return DB::transaction(function () use ($actor, $job, $data): JobPosting {
            $company = $this->company($data);
            $attributes = [
                'company_id' => $company->id,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'employment_type' => $data['employmentType'],
                'location' => $data['location'] ?? null,
                'ctc_min_paise' => isset($data['ctcMinLpa']) ? (int) round($data['ctcMinLpa'] * 10_000_000) : null,
                'ctc_max_paise' => isset($data['ctcMaxLpa']) ? (int) round($data['ctcMaxLpa'] * 10_000_000) : null,
                'stipend_paise' => isset($data['stipendMonthly']) ? (int) round($data['stipendMonthly'] * 100) : null,
                'package_display' => $this->packageDisplay($data),
                'openings' => $data['openings'] ?? null,
                'required_skills' => array_values($data['requiredSkills'] ?? []),
                'apply_deadline' => $data['applyDeadline'] ?? null,
            ];

            if ($job === null) {
                $drive = PlacementDrive::query()->create([
                    'company_id' => $company->id,
                    'title' => "{$company->name}: {$data['title']}",
                    'starts_on' => $data['driveDate'] ?? null,
                    'status' => 'draft',
                    'created_by' => $actor->id,
                ]);
                $job = JobPosting::query()->create([...$attributes, 'drive_id' => $drive->id, 'status' => 'draft', 'created_by' => $actor->id]);
            } else {
                $job->update($attributes);
                $job->drive?->update(['company_id' => $company->id, 'title' => "{$company->name}: {$data['title']}", 'starts_on' => $data['driveDate'] ?? null]);
            }

            if (array_key_exists('eligibility', $data)) {
                $this->replaceRules($job, $data['eligibility'] ?? []);
            }

            $this->mirrorToCompany($job->fresh(['drive', 'eligibilityRules']), $company);

            return $job->fresh(['company', 'drive', 'eligibilityRules']);
        });
    }

    /** @param list<array{field: string, operator: string, value: mixed}> $rules */
    public function replaceRules(JobPosting $job, array $rules): void
    {
        $job->eligibilityRules()->delete();

        foreach ($rules as $rule) {
            $job->eligibilityRules()->create(['field' => $rule['field'], 'operator' => $rule['operator'], 'value' => $rule['value']]);
        }

        $job->unsetRelation('eligibilityRules');
    }

    /** Opens the job and notifies the students who can apply; returns how many were notified. */
    public function publish(JobPosting $job): int
    {
        if ($job->status === 'open') {
            throw BusinessRuleException::unprocessable('This job is already published.');
        }

        if ($job->apply_deadline !== null && $job->apply_deadline->isPast()) {
            throw BusinessRuleException::unprocessable('Set an application deadline in the future before publishing.');
        }

        DB::transaction(function () use ($job): void {
            $job->update(['status' => 'open', 'published_at' => $job->published_at ?? now()]);
            $job->drive?->update(['status' => 'published']);
        });
        $this->mirrorToCompany($job->fresh(['drive', 'eligibilityRules']), $job->company);

        $job->loadMissing('company');
        $recipients = $this->gate->assessMany(Student::query()->whereNotNull('user_id')->get(), $job)
            ->filter(fn (array $assessment) => $assessment['canApply'])
            ->keys();
        $users = Student::query()->whereIn('id', $recipients)->with('user')->get()->pluck('user')->filter();

        Notification::send($users, new JobPublished(
            $job->id,
            $job->title,
            (string) ($job->company?->name ?? 'A company'),
            $job->apply_deadline?->format('j M Y, H:i'),
        ));

        return $users->count();
    }

    public function close(JobPosting $job): void
    {
        DB::transaction(function () use ($job): void {
            $job->update(['status' => 'closed']);
            $job->drive?->update(['status' => 'closed']);
        });
        $this->mirrorToCompany($job->fresh(['drive', 'eligibilityRules']), $job->company);
    }

    public function delete(JobPosting $job): void
    {
        if ($job->applications()->exists()) {
            throw BusinessRuleException::conflict('Students have applied to this job. Close it instead of deleting it.');
        }

        DB::transaction(function () use ($job): void {
            $job->eligibilityRules()->delete();
            $drive = $job->drive;
            $job->delete();
            $drive?->delete();
        });
    }

    /** @param array<string, mixed> $data */
    private function company(array $data): Company
    {
        if (! empty($data['companyId'])) {
            $company = Company::query()->findOrFail($data['companyId']);
        } else {
            $company = Company::query()->whereRaw('lower(name) = ?', [mb_strtolower(trim($data['companyName']))])->first()
                ?? new Company(['name' => trim($data['companyName'])]);
        }

        $company->forceFill(array_filter([
            'industry' => $data['industry'] ?? null,
            'website' => $data['website'] ?? null,
        ], fn ($value) => $value !== null));

        if (! $company->exists) {
            // Legacy columns are required; mirrorToCompany fills them properly.
            $company->forceFill([
                'role' => $data['title'], 'package_offered' => '', 'drive_date' => now()->toDateString(),
                'location' => '', 'status' => 'Upcoming', 'type' => 'Placement', 'eligible_departments' => [],
            ]);
        }

        $company->save();

        return $company;
    }

    private function mirrorToCompany(JobPosting $job, ?Company $company): void
    {
        if (! $company) {
            return;
        }

        $departments = $job->eligibilityRules->firstWhere('field', 'department');

        $company->forceFill([
            'role' => $job->title,
            'package_offered' => $job->package_display ?? '',
            'drive_date' => ($job->drive?->starts_on ?? $job->apply_deadline ?? now())->toDateString(),
            'location' => $job->location ?? '',
            'type' => $job->employment_type === 'internship' ? 'Internship' : 'Placement',
            'status' => match ($job->status) { 'open' => 'Open', 'closed' => 'Closed', default => 'Upcoming' },
            'eligible_departments' => $departments && $departments->operator === 'in' ? array_values((array) $departments->value) : [],
        ])->save();
    }

    /** @param array<string, mixed> $data */
    private function packageDisplay(array $data): ?string
    {
        $format = fn (float $value) => rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');

        if (isset($data['ctcMinLpa'], $data['ctcMaxLpa']) && $data['ctcMinLpa'] != $data['ctcMaxLpa']) {
            return "{$format($data['ctcMinLpa'])}–{$format($data['ctcMaxLpa'])} LPA";
        }

        if (isset($data['ctcMaxLpa']) || isset($data['ctcMinLpa'])) {
            return $format($data['ctcMaxLpa'] ?? $data['ctcMinLpa']).' LPA';
        }

        if (isset($data['stipendMonthly'])) {
            return number_format($data['stipendMonthly']).'/month';
        }

        return null;
    }
}
