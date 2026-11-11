<?php

namespace App\Notifications;

/** Sent to an institution's admins when its lifecycle or verification status changes. Plain values: queued without a tenant. */
class InstitutionStatusChanged extends CampusNotification
{
    public function __construct(
        public readonly string $institution,
        public readonly string $kind,
        public readonly string $status,
        public readonly ?string $reason,
        public readonly ?string $effective,
    ) {
    }

    public function category(): string
    {
        return 'account';
    }

    public function title(): string
    {
        $status = str_replace('_', ' ', $this->status);

        return $this->kind === 'verification'
            ? "{$this->institution}: verification {$status}"
            : "{$this->institution} is now {$status}";
    }

    public function body(): string
    {
        $when = $this->effective ? " from {$this->effective}" : '';
        $why = $this->reason ? " Reason: {$this->reason}" : '';
        $status = str_replace('_', ' ', $this->status);

        return match ($this->status) {
            'suspended' => "Access to Alpha Grew for {$this->institution} is suspended{$when}. Your data is kept.{$why}",
            'active' => "Access to Alpha Grew for {$this->institution} is active{$when}.{$why}",
            'requires_information' => "Chromolog needs more information to verify {$this->institution}.{$why}",
            default => "The status of {$this->institution} changed to {$status}{$when}.{$why}",
        };
    }
}
