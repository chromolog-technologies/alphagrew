<?php

namespace App\Http\Resources;

use App\Models\Student;
use App\Support\Campus\CampusMasterCatalog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Student
 */
class StudentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->resource->loadMissing(['applications', 'studentSkills.skill', 'academicSummary']);
        $summary = $this->academicSummary;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'registrationNumber' => $this->registration_number,
            'departmentCode' => $this->department_code,
            'year' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_YEAR, $this->year) ?? 'year_1',
            'gender' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_GENDER, $this->gender) ?? 'prefer_not_to_say',
            'status' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::STUDENT_STATUS, $this->status) ?? 'active',
            // Derived from published results once there are any; until then the hand-entered value.
            'cgpa' => $summary?->isDerived() ? (float) $summary->cgpa : (float) $this->cgpa,
            'cgpaSource' => $summary?->source ?? 'manual',
            'activeBacklogs' => $summary?->active_backlogs ?? 0,
            'attendance' => (int) $this->attendance,
            'phone' => $this->phone ?? '',
            'mentor' => $this->mentor ?? '',
            'feeStatus' => CampusMasterCatalog::normalizeValue(CampusMasterCatalog::PAYMENT_STATUS, $this->fee_status) ?? 'pending',
            'placedCompany' => $this->placed_company,
            'appliedCompanyIds' => $this->applications->pluck('company_id')->values()->all(),
            'skills' => $this->studentSkills->pluck('skill.name')->filter()->sort()->values()->all(),
            'resume' => $this->resume_profile,
        ];
    }
}
