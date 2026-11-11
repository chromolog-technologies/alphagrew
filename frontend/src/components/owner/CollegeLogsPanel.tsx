/**
 * Shared Owner Console panel aggregating all 7 log streams for an institution:
 * Audit logs, Activity logs, Login history, Security events, Status events, Subscription events, and AI usage.
 */
import { useState } from 'react';
import {
  Activity,
  Bot,
  CreditCard,
  ExternalLink,
  Eye,
  FileClock,
  KeyRound,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { useInstitutionLogs, type CollegeLogCategory, type CollegeLogTimelineItem } from '@/api/ownerApi';
import { EmptyState, ErrorState, LoadingRows, actionLabel, formatDateTime } from './ownerUi';

interface CollegeLogsPanelProps {
  institutionId: number;
  institutionName?: string | null;
  onOpenSecurity?: () => void;
  title?: string;
}

type CategoryKey = Exclude<CollegeLogCategory, 'all'>;

const CATEGORY_META: Record<
  CategoryKey,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
    icon: typeof Activity;
  }
> = {
  audit: { label: 'Audit', variant: 'default', icon: FileClock },
  activity: { label: 'Activity', variant: 'secondary', icon: Activity },
  login: { label: 'Logins', variant: 'info', icon: KeyRound },
  security: { label: 'Security', variant: 'destructive', icon: ShieldAlert },
  status: { label: 'Status', variant: 'warning', icon: ShieldCheck },
  subscription: { label: 'Subscriptions', variant: 'success', icon: CreditCard },
  ai: { label: 'AI usage', variant: 'outline', icon: Bot },
};

const CATEGORY_ORDER: CategoryKey[] = ['audit', 'activity', 'login', 'security', 'status', 'subscription', 'ai'];

function statusBadgeVariant(value: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' {
  const normalized = value.toLowerCase();
  if (['success', 'active', 'verified', 'resolved'].includes(normalized)) return 'success';
  if (['failed', 'critical', 'high', 'locked', 'refused', 'mfa_failed', 'suspended', 'error', 'cancelled', 'expired'].includes(normalized)) {
    return 'destructive';
  }
  if (['warning', 'open', 'pending', 'requires_information', 'paused', 'past_due', 'trial'].includes(normalized)) return 'warning';
  if (['info', 'acknowledged', 'created', 'updated'].includes(normalized)) return 'info';
  return 'secondary';
}

export function CollegeLogsPanel({ institutionId, institutionName, onOpenSecurity, title }: CollegeLogsPanelProps) {
  const [category, setCategory] = useState<CollegeLogCategory>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [inspecting, setInspecting] = useState<CollegeLogTimelineItem | null>(null);

  const logs = useInstitutionLogs(institutionId, {
    category,
    search: search.trim() || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const data = logs.data;
  const counts = data?.counts;
  const resolvedName = institutionName || data?.institution.name || `Institution #${institutionId}`;
  const hasFilters = category !== 'all' || search.trim() !== '' || from !== '' || to !== '';

  const resetFilters = () => {
    setCategory('all');
    setSearch('');
    setFrom('');
    setTo('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base">{title ?? `College logs — ${resolvedName}`}</CardTitle>
          <CardDescription>
            Unified Super Admin timeline across Audit, Activity, Login history, Security events, Status checks, Subscriptions, and AI usage.
          </CardDescription>
        </div>
        {onOpenSecurity ? (
          <Button type="button" variant="outline" size="sm" onClick={onOpenSecurity} className="shrink-0 gap-1.5">
            <span>Open in Audit &amp; security</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Log stream filters">
          <Button
            type="button"
            size="sm"
            variant={category === 'all' ? 'default' : 'outline'}
            onClick={() => setCategory('all')}
            className="h-8 gap-1.5 text-xs"
          >
            <span>All timeline</span>
            {counts ? <span className="rounded bg-background/20 px-1.5 py-0.5 text-[11px]">{counts.total}</span> : null}
          </Button>
          {CATEGORY_ORDER.map((key) => {
            const meta = CATEGORY_META[key];
            const Icon = meta.icon;
            const count = counts ? counts[key] : null;
            return (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={category === key ? 'default' : 'outline'}
                onClick={() => setCategory(key)}
                className="h-8 gap-1.5 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{meta.label}</span>
                {count !== null ? <span className="rounded bg-background/20 px-1.5 py-0.5 text-[11px]">{count}</span> : null}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, email, action, IP, summary, model..."
              aria-label="Search college logs"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="w-40"
            />
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="w-40"
            />
            {hasFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </Button>
            ) : null}
          </div>
        </div>

        {logs.isLoading ? (
          <LoadingRows />
        ) : logs.isError ? (
          <ErrorState error={logs.error} onRetry={() => void logs.refetch()} />
        ) : !data || data.timeline.length === 0 ? (
          <EmptyState
            title="No college logs found"
            description={
              hasFilters
                ? 'No events in this college matched the current stream, date range, or search filter.'
                : 'No audit, activity, authentication, security, status, subscription, or AI usage events are recorded for this college yet.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">When</TableHead>
                  <TableHead className="w-32">Stream</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor &amp; IP</TableHead>
                  <TableHead className="w-32">Outcome</TableHead>
                  <TableHead className="w-24 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.timeline.map((item) => {
                  const meta = CATEGORY_META[item.category];
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(item.at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{actionLabel(item.title)}</div>
                        {item.detail ? <div className="text-xs text-muted-foreground">{item.detail}</div> : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{item.actor || 'System'}</div>
                        {item.ip ? <div className="font-mono text-[11px] text-muted-foreground">{item.ip}</div> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(item.statusOrSeverity)} className="capitalize">
                          {item.statusOrSeverity.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.metadata ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setInspecting(item)}
                            className="h-7 gap-1 px-2 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={inspecting !== null} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="max-w-xl" onClose={() => setInspecting(null)}>
          <DialogHeader>
            <DialogTitle>{inspecting ? actionLabel(inspecting.title) : 'Log event details'}</DialogTitle>
            <DialogDescription>
              {inspecting
                ? `${CATEGORY_META[inspecting.category].label} · ${formatDateTime(inspecting.at)} · ${inspecting.actor || 'System'}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {inspecting ? (
            <div className="space-y-2 text-xs">
              {inspecting.detail ? <p className="text-muted-foreground">{inspecting.detail}</p> : null}
              <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                {JSON.stringify(inspecting.metadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
