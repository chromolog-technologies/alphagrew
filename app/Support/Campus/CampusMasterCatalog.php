<?php

namespace App\Support\Campus;

use App\Models\MasterOption;
use Illuminate\Support\Str;

class CampusMasterCatalog
{
    public const STUDENT_GENDER = 'student_gender';
    public const STUDENT_YEAR = 'student_year';
    public const STUDENT_STATUS = 'student_status';
    public const PAYMENT_STATUS = 'payment_status';
    public const COMPANY_DRIVE_STATUS = 'company_drive_status';
    public const COMPANY_DRIVE_TYPE = 'company_drive_type';
    public const ANNOUNCEMENT_AUDIENCE = 'announcement_audience';
    public const ANNOUNCEMENT_PRIORITY = 'announcement_priority';

    public static function categories(): array
    {
        return [
            self::STUDENT_GENDER => 'Student genders',
            self::STUDENT_YEAR => 'Academic years',
            self::STUDENT_STATUS => 'Student statuses',
            self::PAYMENT_STATUS => 'Payment statuses',
            self::COMPANY_DRIVE_STATUS => 'Company drive statuses',
            self::COMPANY_DRIVE_TYPE => 'Company drive types',
            self::ANNOUNCEMENT_AUDIENCE => 'Announcement audiences',
            self::ANNOUNCEMENT_PRIORITY => 'Announcement priorities',
        ];
    }

    public static function allowedCategories(): array
    {
        return array_keys(self::categories());
    }

    public static function defaultOptions(): array
    {
        return [
            ['category' => self::STUDENT_GENDER, 'code' => 'male', 'label' => 'Male', 'description' => 'Male student record.', 'sort_order' => 1],
            ['category' => self::STUDENT_GENDER, 'code' => 'female', 'label' => 'Female', 'description' => 'Female student record.', 'sort_order' => 2],
            ['category' => self::STUDENT_GENDER, 'code' => 'non_binary', 'label' => 'Non-binary', 'description' => 'Non-binary student record.', 'sort_order' => 3],
            ['category' => self::STUDENT_GENDER, 'code' => 'prefer_not_to_say', 'label' => 'Prefer not to say', 'description' => 'Gender intentionally omitted.', 'sort_order' => 4],
            ['category' => self::STUDENT_YEAR, 'code' => 'year_1', 'label' => '1st Year', 'description' => 'First-year academic record.', 'sort_order' => 1],
            ['category' => self::STUDENT_YEAR, 'code' => 'year_2', 'label' => '2nd Year', 'description' => 'Second-year academic record.', 'sort_order' => 2],
            ['category' => self::STUDENT_YEAR, 'code' => 'year_3', 'label' => '3rd Year', 'description' => 'Third-year academic record.', 'sort_order' => 3],
            ['category' => self::STUDENT_YEAR, 'code' => 'year_4', 'label' => '4th Year', 'description' => 'Final-year academic record.', 'sort_order' => 4],
            ['category' => self::STUDENT_STATUS, 'code' => 'active', 'label' => 'Active', 'description' => 'Student is active in the campus system.', 'sort_order' => 1],
            ['category' => self::STUDENT_STATUS, 'code' => 'placement_ready', 'label' => 'Placement Ready', 'description' => 'Student is ready for placement drives.', 'sort_order' => 2],
            ['category' => self::STUDENT_STATUS, 'code' => 'placed', 'label' => 'Placed', 'description' => 'Student has received an offer.', 'sort_order' => 3],
            ['category' => self::PAYMENT_STATUS, 'code' => 'paid', 'label' => 'Paid', 'description' => 'Fees are fully settled.', 'sort_order' => 1],
            ['category' => self::PAYMENT_STATUS, 'code' => 'pending', 'label' => 'Pending', 'description' => 'Fees still need follow-up.', 'sort_order' => 2],
            ['category' => self::COMPANY_DRIVE_STATUS, 'code' => 'upcoming', 'label' => 'Upcoming', 'description' => 'Drive is scheduled for a future date.', 'sort_order' => 1],
            ['category' => self::COMPANY_DRIVE_STATUS, 'code' => 'open', 'label' => 'Open', 'description' => 'Drive is open for applications.', 'sort_order' => 2],
            ['category' => self::COMPANY_DRIVE_STATUS, 'code' => 'closing_soon', 'label' => 'Closing Soon', 'description' => 'Drive closes shortly.', 'sort_order' => 3],
            ['category' => self::COMPANY_DRIVE_STATUS, 'code' => 'closed', 'label' => 'Closed', 'description' => 'Drive is closed.', 'sort_order' => 4],
            ['category' => self::COMPANY_DRIVE_TYPE, 'code' => 'placement', 'label' => 'Placement', 'description' => 'Full placement drive.', 'sort_order' => 1],
            ['category' => self::COMPANY_DRIVE_TYPE, 'code' => 'internship', 'label' => 'Internship', 'description' => 'Internship hiring drive.', 'sort_order' => 2],
            ['category' => self::ANNOUNCEMENT_AUDIENCE, 'code' => 'all', 'label' => 'All', 'description' => 'Visible to everyone.', 'sort_order' => 1],
            ['category' => self::ANNOUNCEMENT_AUDIENCE, 'code' => 'students', 'label' => 'Students', 'description' => 'Visible to students.', 'sort_order' => 2],
            ['category' => self::ANNOUNCEMENT_AUDIENCE, 'code' => 'staff', 'label' => 'Staff', 'description' => 'Visible to staff.', 'sort_order' => 3],
            ['category' => self::ANNOUNCEMENT_AUDIENCE, 'code' => 'admin', 'label' => 'Admin', 'description' => 'Visible to admins.', 'sort_order' => 4],
            ['category' => self::ANNOUNCEMENT_PRIORITY, 'code' => 'high', 'label' => 'High', 'description' => 'Urgent announcement.', 'sort_order' => 1],
            ['category' => self::ANNOUNCEMENT_PRIORITY, 'code' => 'medium', 'label' => 'Medium', 'description' => 'Standard announcement.', 'sort_order' => 2],
            ['category' => self::ANNOUNCEMENT_PRIORITY, 'code' => 'low', 'label' => 'Low', 'description' => 'Low-priority announcement.', 'sort_order' => 3],
        ];
    }

    public static function defaultCodes(string $category): array
    {
        return collect(self::defaultOptions())
            ->where('category', $category)
            ->pluck('code')
            ->values()
            ->all();
    }

    public static function optionsFor(string $category): array
    {
        if (class_exists(MasterOption::class) && MasterOption::query()->getModel()->getConnection()->getSchemaBuilder()->hasTable('master_options')) {
            $codes = MasterOption::query()
                ->where('category', $category)
                ->orderBy('sort_order')
                ->orderBy('label')
                ->pluck('code')
                ->filter()
                ->values()
                ->all();

            if ($codes !== []) {
                return $codes;
            }
        }

        return self::defaultCodes($category);
    }

    public static function labelFor(string $category, ?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $default = collect(self::defaultOptions())
            ->first(fn (array $option) => $option['category'] === $category && ($option['code'] === $value || strcasecmp($option['label'], $value) === 0));

        return $default['label'] ?? null;
    }

    public static function normalizeValue(string $category, ?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $normalized = collect(self::defaultOptions())
            ->first(function (array $option) use ($category, $value): bool {
                return $option['category'] === $category
                    && ($option['code'] === $value || strcasecmp($option['label'], $value) === 0);
            });

        return $normalized['code'] ?? Str::slug($value, '_');
    }
}
