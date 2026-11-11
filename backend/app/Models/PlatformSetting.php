<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Global platform settings (Owner Dashboard SRS §5.22), one row per key. Read through
 * PlatformSetting::get(), which falls back to DEFAULTS and caches for a minute.
 */
class PlatformSetting extends Model
{
    public const DEFAULTS = [
        'platformName' => 'Alpha Grew',
        'brandTagline' => 'Campus placement, assessment & AI readiness cloud',
        'brandPrimaryColor' => '#2563eb',
        'supportEmail' => null,
        'supportPhone' => null,
        'defaultTimezone' => 'Asia/Kolkata',
        'defaultLanguage' => 'en',
        'currency' => 'INR',
        'dateFormat' => 'DD MMM YYYY',
        'defaultTrialDays' => 30,
        'maxUploadMb' => 10,
        'passwordMinLength' => 8,
        'sessionTimeoutMinutes' => 120,
        'mfaRequiredForPlatformStaff' => false,
        'billingDefaultTaxCode' => 'GST-18',
        'maintenanceEnabled' => false,
        'maintenanceMessage' => 'Alpha Grew is down for scheduled maintenance. Please try again shortly.',
        'maintenanceBypassIps' => [],
    ];

    private const CACHE_KEY = 'platform_settings';

    protected $fillable = ['key', 'value', 'updated_by'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    /** @return array<string, mixed> */
    public static function values(): array
    {
        return Cache::remember(self::CACHE_KEY, 60, fn () => [
            ...self::DEFAULTS,
            ...static::query()->pluck('value', 'key')->only(array_keys(self::DEFAULTS))->all(),
        ]);
    }

    public static function get(string $key): mixed
    {
        return self::values()[$key] ?? self::DEFAULTS[$key] ?? null;
    }

    /** @param array<string, mixed> $values */
    public static function put(array $values, ?int $userId): void
    {
        foreach ($values as $key => $value) {
            static::query()->updateOrCreate(['key' => $key], ['value' => $value, 'updated_by' => $userId]);
        }

        Cache::forget(self::CACHE_KEY);
    }
}
