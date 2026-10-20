<?php

namespace App\Enums;

/**
 * Job application lifecycle (Student Journey spec, step 13).
 *
 * applied → shortlisted → in_rounds → selected → offered → placed
 *         ↘ rejected / withdrawn          offered → offer_declined
 */
enum ApplicationStatus: string
{
    case Applied = 'applied';
    case Shortlisted = 'shortlisted';
    case InRounds = 'in_rounds';
    case Selected = 'selected';
    case Offered = 'offered';
    case Placed = 'placed';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';
    case OfferDeclined = 'offer_declined';

    /** @return list<self> */
    public function allowedNext(): array
    {
        return match ($this) {
            self::Applied => [self::Shortlisted, self::Rejected, self::Withdrawn],
            self::Shortlisted => [self::InRounds, self::Selected, self::Rejected],
            self::InRounds => [self::InRounds, self::Selected, self::Rejected],
            self::Selected => [self::Offered, self::Rejected],
            self::Offered => [self::Placed, self::OfferDeclined],
            self::Placed, self::Rejected, self::Withdrawn, self::OfferDeclined => [],
        };
    }

    public function canMoveTo(self $next): bool
    {
        return in_array($next, $this->allowedNext(), true);
    }

    public function isFinal(): bool
    {
        return $this->allowedNext() === [];
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
