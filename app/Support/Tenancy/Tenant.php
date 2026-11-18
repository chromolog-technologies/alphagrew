<?php

namespace App\Support\Tenancy;

/**
 * The institution the current request (or job) acts for. Set by the SetTenant middleware
 * from the authenticated user — never from request input.
 *
 * - Institution users: id() is their institution; every tenant model is filtered to it.
 * - Super Admin: bypassesScope() is true; nothing is filtered.
 * - No context (console, seeders, unauthenticated routes): nothing is filtered, and
 *   code must set institution_id explicitly when creating rows.
 */
final class Tenant
{
    private ?int $institutionId = null;

    private bool $bypass = false;

    public function set(int $institutionId): void
    {
        $this->institutionId = $institutionId;
        $this->bypass = false;
    }

    public function bypass(): void
    {
        $this->institutionId = null;
        $this->bypass = true;
    }

    public function forget(): void
    {
        $this->institutionId = null;
        $this->bypass = false;
    }

    public function id(): ?int
    {
        return $this->institutionId;
    }

    public function bypassesScope(): bool
    {
        return $this->bypass;
    }

    /** Whether queries should be filtered to one institution right now. */
    public function scopes(): bool
    {
        return ! $this->bypass && $this->institutionId !== null;
    }

    /**
     * Run $callback acting for $institutionId, then restore the previous context.
     * Use in queued jobs and commands that work on one institution's data.
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public function runAs(int $institutionId, callable $callback): mixed
    {
        [$previousId, $previousBypass] = [$this->institutionId, $this->bypass];
        $this->set($institutionId);

        try {
            return $callback();
        } finally {
            [$this->institutionId, $this->bypass] = [$previousId, $previousBypass];
        }
    }
}
