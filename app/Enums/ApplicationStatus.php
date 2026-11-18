<?php

namespace App\Enums;

/**
 * Job application lifecycle (Student Journey spec, step 13).
 *
 * applied → shortlisted → in_rounds → selected → offered → placed
 *         ↘ rejected / withdrawn (until an offer)   offered → offer_declined / offer_expired
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
    case OfferExpired = 'offer_expired';

    /** @return list<self> */
    public function allowedNext(): array
    {
        return match ($this) {
            self::Applied => [self::Shortlisted, self::Rejected, self::Withdrawn],
            self::Shortlisted => [self::InRounds, self::Selected, self::Rejected, self::Withdrawn],
            self::InRounds => [self::InRounds, self::Selected, self::Rejected, self::Withdrawn],
            self::Selected => [self::Offered, self::Rejected, self::Withdrawn],
            self::Offered => [self::Placed, self::OfferDeclined, self::OfferExpired],
            self::Placed, self::Rejected, self::Withdrawn, self::OfferDeclined, self::OfferExpired => [],
        };
    }

    public function canMoveTo(self $next): bool
    {
        return in_array($next, $this->allowedNext(), true);
    }

    /** Still in the running: counts towards the active-application limit. */
    public function isActive(): bool
    {
        return ! $this->isFinal();
    }

    public function label(): string
    {
        return match ($this) {
            self::Applied => 'Applied',
            self::Shortlisted => 'Shortlisted',
            self::InRounds => 'In rounds',
            self::Selected => 'Selected',
            self::Offered => 'Offer made',
            self::Placed => 'Placed',
            self::Rejected => 'Not selected',
            self::Withdrawn => 'Withdrawn',
            self::OfferDeclined => 'Offer declined',
            self::OfferExpired => 'Offer expired',
        };
    }

    /** @return list<string> */
    public static function activeValues(): array
    {
        return array_values(array_map(fn (self $s) => $s->value, array_filter(self::cases(), fn (self $s) => $s->isActive())));
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
