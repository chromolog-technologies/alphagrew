/** Live platform health indicators (SRS FR-SYS). */
import { RefreshCw } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useSystemHealth, type HealthStatus } from '../../api/ownerApi';
import { ErrorState, formatDateTime, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

const badgeVariant: Record<HealthStatus, 'success' | 'warning' | 'destructive'> = {
  ok: 'success',
  warning: 'warning',
  down: 'destructive',
};

export function SystemHealthPage(_props: OwnerPageProps) {
  const health = useSystemHealth();

  return (
    <div className="space-y-5">
      <PageHeader
        title="System health"
        description="Live database, queue, storage, and AI telemetry status across the platform."
        actions={
          <Button size="sm" variant="outline" onClick={() => void health.refetch()} disabled={health.isFetching}>
            <RefreshCw size={14} className={health.isFetching ? 'animate-spin' : ''} /> Refresh
          </Button>
        }
      />

      {health.isPending ? <LoadingRows rows={3} /> : null}
      {health.isError ? <ErrorState error={health.error} onRetry={() => void health.refetch()} /> : null}

      {health.data ? (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Overall status</span>
                <Badge variant={badgeVariant[health.data.status] ?? 'warning'} className="uppercase">
                  {health.data.status}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">Checked {formatDateTime(health.data.checkedAt)}</span>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.data.checks.map((check) => (
              <Card key={check.key}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold">{check.label}</CardTitle>
                  <Badge variant={badgeVariant[check.status] ?? 'warning'} className="uppercase">
                    {check.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                  <p className="text-muted-foreground">{check.detail}</p>
                  {check.value !== null ? <p className="font-mono font-semibold text-foreground">{String(check.value)}</p> : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

