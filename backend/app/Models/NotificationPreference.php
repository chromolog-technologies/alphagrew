<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per user and category: whether notifications appear in the app and whether they are emailed.
 * A missing row means the defaults in CATEGORIES.
 */
class NotificationPreference extends Model
{
    /** category => [label, description, default in-app, default mail] */
    public const CATEGORIES = [
        'placement' => ['Placements', 'New jobs you are eligible for, application updates, rounds and offers.', true, true],
        'academics' => ['Academics', 'Marks, results and attendance.', true, false],
        'announcements' => ['Announcements', 'Notices from the institution.', true, false],
        'account' => ['Account', 'Sign-in and account changes.', true, true],
    ];

    protected $fillable = ['user_id', 'category', 'in_app', 'mail'];

    protected function casts(): array
    {
        return ['in_app' => 'boolean', 'mail' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return array{inApp: bool, mail: bool} */
    public static function for(User $user, string $category): array
    {
        [, , $inApp, $mail] = self::CATEGORIES[$category] ?? self::CATEGORIES['account'];
        $row = static::query()->where('user_id', $user->id)->where('category', $category)->first();

        return ['inApp' => $row?->in_app ?? $inApp, 'mail' => $row?->mail ?? $mail];
    }
}
