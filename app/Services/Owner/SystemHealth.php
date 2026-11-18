<?php

namespace App\Services\Owner;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Point-in-time health signals (Owner Dashboard SRS FR-SYS-001..004). These are monitoring
 * signals taken when the page is opened, not an uptime guarantee; each says when it was
 * checked. Thresholds: queue backlog > 100 or oldest job > 15 min, any failed job in 24 h,
 * storage > 85 % used, scheduler silent for > 5 min.
 */
class SystemHealth
{
    public const HEARTBEAT_KEY = 'owner.scheduler_heartbeat';

    /** @return array{status: string, checkedAt: string, environment: string, checks: list<array{key: string, label: string, status: string, detail: string, value: mixed}>} */
    public function snapshot(): array
    {
        $checks = [
            $this->database(),
            $this->cache(),
            ...$this->queue(),
            $this->storage(),
            $this->scheduler(),
            $this->aiProvider(),
            $this->mail(),
        ];

        $statuses = array_column($checks, 'status');

        return [
            'status' => in_array('down', $statuses, true) ? 'down' : (in_array('warning', $statuses, true) ? 'warning' : 'ok'),
            'checkedAt' => now()->toIso8601String(),
            'environment' => app()->environment(),
            'checks' => $checks,
        ];
    }

    private function database(): array
    {
        try {
            $started = microtime(true);
            DB::select('select 1');
            $ms = (int) round((microtime(true) - $started) * 1000);

            return $this->check('database', 'Database', $ms > 500 ? 'warning' : 'ok', "Responded in {$ms} ms ({$this->driver()})", $ms);
        } catch (Throwable) {
            return $this->check('database', 'Database', 'down', 'Not reachable', null);
        }
    }

    private function cache(): array
    {
        try {
            Cache::put('owner.health_probe', 'ok', 30);
            $ok = Cache::get('owner.health_probe') === 'ok';

            return $this->check('cache', 'Cache', $ok ? 'ok' : 'down', $ok ? 'Read and write work ('.config('cache.default').')' : 'Read after write failed', null);
        } catch (Throwable) {
            return $this->check('cache', 'Cache', 'down', 'Not reachable', null);
        }
    }

    /** @return list<array<string, mixed>> */
    private function queue(): array
    {
        if (config('queue.default') !== 'database') {
            return [$this->check('queue', 'Queue', 'ok', 'Driver '.config('queue.default').' (backlog not measured)', null)];
        }

        $backlog = DB::table('jobs')->count();
        $oldest = DB::table('jobs')->min('created_at');
        $ageMinutes = $oldest ? (int) floor((time() - (int) $oldest) / 60) : 0;
        $failed = DB::table('failed_jobs')->where('failed_at', '>=', now()->subDay())->count();

        return [
            $this->check('queue', 'Queue backlog', $backlog > 100 || $ageMinutes > 15 ? 'warning' : 'ok',
                $backlog === 0 ? 'No waiting jobs' : "{$backlog} waiting, oldest {$ageMinutes} min — is a worker running?", $backlog),
            $this->check('failed_jobs', 'Failed jobs (24 h)', $failed > 0 ? 'warning' : 'ok', $failed === 0 ? 'None' : "{$failed} failed", $failed),
        ];
    }

    private function storage(): array
    {
        $path = storage_path();
        $total = @disk_total_space($path) ?: 0;
        $free = @disk_free_space($path) ?: 0;

        if ($total <= 0) {
            return $this->check('storage', 'Storage', 'warning', 'Could not measure the disk', null);
        }

        $used = (int) round(($total - $free) / $total * 100);

        return $this->check('storage', 'Storage', $used > 85 ? 'warning' : 'ok', "{$used}% of ".round($total / 1073741824).' GB used', $used);
    }

    private function scheduler(): array
    {
        $last = Cache::get(self::HEARTBEAT_KEY);

        if (! $last) {
            return $this->check('scheduler', 'Scheduler', 'warning', 'No heartbeat yet — run php artisan schedule:work or the cron entry', null);
        }

        $minutes = (int) floor((time() - (int) $last) / 60);

        return $this->check('scheduler', 'Scheduler', $minutes > 5 ? 'warning' : 'ok', $minutes === 0 ? 'Ran this minute' : "Last ran {$minutes} min ago", $minutes);
    }

    private function aiProvider(): array
    {
        $configured = filled(config('ai.providers.anthropic.key'));

        return $this->check('ai', 'AI provider', $configured ? 'ok' : 'warning', $configured ? 'API key configured' : 'No API key: built-in fallbacks are used', null);
    }

    private function mail(): array
    {
        $mailer = (string) config('mail.default');

        return $this->check('mail', 'Email', in_array($mailer, ['log', 'array'], true) ? 'warning' : 'ok',
            in_array($mailer, ['log', 'array'], true) ? "Mailer is {$mailer}: emails are not delivered" : "Mailer {$mailer}", null);
    }

    private function driver(): string
    {
        return (string) DB::connection()->getDriverName();
    }

    private function check(string $key, string $label, string $status, string $detail, mixed $value): array
    {
        return compact('key', 'label', 'status', 'detail', 'value');
    }
}
