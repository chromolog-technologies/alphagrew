<?php

namespace App\Support\Placement;

use Illuminate\Support\Facades\DB;

/**
 * Turns legacy company rows (company = job = drive) into one placement drive with one
 * job posting each, with a department eligibility rule, and copies company_applications
 * into job_applications. Used by the placement migration and by the demo seeder.
 * Works on raw tables, without tenant context. Skips companies already imported.
 */
final class LegacyCompanyImporter
{
    private const STATUS_MAP = [
        'upcoming' => ['published', 'open'],
        'open' => ['published', 'open'],
        'closing_soon' => ['published', 'open'],
        'closed' => ['closed', 'closed'],
    ];

    public function import(): int
    {
        $imported = 0;
        $alreadyImported = DB::table('job_postings')->whereNotNull('legacy_company_id')->pluck('legacy_company_id')->all();

        $companies = DB::table('companies')
            ->whereNull('deleted_at')
            ->whereNotIn('id', $alreadyImported)
            ->orderBy('id')
            ->get();

        foreach ($companies as $company) {
            $this->importCompany($company);
            $imported++;
        }

        return $imported;
    }

    private function importCompany(object $company): void
    {
        [$driveStatus, $postingStatus] = self::STATUS_MAP[strtolower((string) $company->status)] ?? ['published', 'open'];
        $now = now();

        $driveId = DB::table('placement_drives')->insertGetId([
            'institution_id' => $company->institution_id,
            'company_id' => $company->id,
            'title' => "{$company->name} campus drive",
            'starts_on' => $company->drive_date,
            'status' => $driveStatus,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $postingId = DB::table('job_postings')->insertGetId([
            'institution_id' => $company->institution_id,
            'drive_id' => $driveId,
            'company_id' => $company->id,
            'title' => $company->role,
            'employment_type' => str_contains(strtolower((string) $company->type), 'intern') ? 'internship' : 'full_time',
            'location' => $company->location,
            'package_display' => $company->package_offered,
            'apply_deadline' => $company->drive_date ? substr((string) $company->drive_date, 0, 10).' 23:59:59' : null,
            'status' => $postingStatus,
            'legacy_company_id' => $company->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $departments = json_decode($company->eligible_departments ?? '[]', true) ?: [];
        if ($departments !== []) {
            DB::table('eligibility_rules')->insert([
                'institution_id' => $company->institution_id,
                'job_posting_id' => $postingId,
                'field' => 'department',
                'operator' => 'in',
                'value' => json_encode(array_values($departments)),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $legacyApplications = DB::table('company_applications')
            ->where('company_id', $company->id)
            ->whereNull('deleted_at')
            ->get();

        foreach ($legacyApplications as $legacy) {
            $applicationId = DB::table('job_applications')->insertGetId([
                'institution_id' => $company->institution_id,
                'job_posting_id' => $postingId,
                'student_id' => $legacy->student_id,
                'status' => 'applied',
                'applied_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('job_application_events')->insert([
                'institution_id' => $company->institution_id,
                'job_application_id' => $applicationId,
                'to_status' => 'applied',
                'note' => 'Imported from company_applications',
                'created_at' => $now,
            ]);
        }
    }
}
