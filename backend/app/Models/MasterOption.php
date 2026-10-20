<?php

namespace App\Models;

use App\Traits\BelongsToInstitution;
use App\Support\Campus\CampusMasterCatalog;
use Illuminate\Database\Eloquent\Model;

class MasterOption extends Model
{
    use BelongsToInstitution;

    protected $fillable = [
        'category',
        'code',
        'label',
        'description',
        'sort_order',
    ];

    /**
     * Number of campus records that still use this option's code.
     */
    public function usageCount(): int
    {
        return match ($this->category) {
            CampusMasterCatalog::STUDENT_GENDER => Student::query()->where('gender', $this->code)->count(),
            CampusMasterCatalog::STUDENT_YEAR => Student::query()->where('year', $this->code)->count(),
            CampusMasterCatalog::STUDENT_STATUS => Student::query()->where('status', $this->code)->count(),
            CampusMasterCatalog::PAYMENT_STATUS => Student::query()->where('fee_status', $this->code)->count(),
            CampusMasterCatalog::COMPANY_DRIVE_STATUS => Company::query()->where('status', $this->code)->count(),
            CampusMasterCatalog::COMPANY_DRIVE_TYPE => Company::query()->where('type', $this->code)->count(),
            CampusMasterCatalog::ANNOUNCEMENT_AUDIENCE => Announcement::query()->where('audience', $this->code)->count(),
            CampusMasterCatalog::ANNOUNCEMENT_PRIORITY => Announcement::query()->where('priority', $this->code)->count(),
            default => 0,
        };
    }
}
