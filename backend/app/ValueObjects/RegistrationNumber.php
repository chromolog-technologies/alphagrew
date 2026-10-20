<?php

namespace App\ValueObjects;

use Stringable;

/**
 * Student registration number: "BIT" + two-digit admission year + department code
 * + three-digit sequence, e.g. BIT26CSE021.
 */
final readonly class RegistrationNumber implements Stringable
{
    private function __construct(public string $value)
    {
    }

    public static function generate(string $departmentCode, int $sequence, ?int $admissionYear = null): self
    {
        $year = $admissionYear ?? (int) now()->format('Y');

        return new self(sprintf('BIT%02d%s%03d', $year % 100, strtoupper($departmentCode), $sequence));
    }

    public function __toString(): string
    {
        return $this->value;
    }
}
