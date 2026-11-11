/** Owner overview (SRS FR-OV): platform KPIs, growth and AI usage trends, alerts and recent activity. */
import { AlertTriangle, Bot, Building2, Coins, CreditCard, Info, RefreshCw, Repeat, ShieldAlert, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { institutionStatusLabels, useOwnerActivity, useOwnerAlerts, useOwnerSummary, useOwnerTrends, type InstitutionStatus } from '../../api/ownerApi';
import { actionLabel, EmptyState, ErrorState, formatDateTime, formatMoney, KpiCard, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

const number = new Intl.NumberFormat();
const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short' });

export function OwnerOverview({ go }: OwnerPageProps) {
  const summary = useOwnerSummary();
  const trends = useOwnerTrends();
  const alerts = useOwnerAlerts();
  const activity = useOwnerActivity();
  const data = summary.data;

  const refresh = () => {
    void summary.refetch();
    void trends.refetch();
    void alerts.refetch();
    void activity.refetch();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform overview"
        description="Institutions, people and AI usage across every tenant for the last 30 days."
        actions={
          <>
            {data ? <span className="text-xs text-muted-foreground">Updated {formatDateTime(data.generatedAt)}</span> : null}
            <Button variant="outline" size="sm" onClick={refresh} disabled={summary.isFetching}>
              <RefreshCw size={14} className={summary.isFetching ? 'animate-spin' : ''} /> Refresh
            </Button>
          </>
        }
      />

      {summary.isError ? <ErrorState error={summary.error} onRetry={() => void summary.refetch()} /> : null}
      {summary.isPending ? <LoadingRows rows={3} /> : null}

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Institutions"
              value={number.format(data.institutions.total)}
              hint={`${data.institutions.byStatus.active} active · ${data.institutions.byStatus.trial} on trial · ${data.institutions.newInPeriod} new`}
              icon={<Building2 size={18} />}
            />
            <KpiCard
              label="Users"
              value={number.format(data.users.total)}
              hint={`${number.format(data.users.activeInPeriod)} signed in during the period`}
              icon={<Users size={18} />}
            />
            <KpiCard
              label="AI requests"
              value={number.format(data.ai.calls)}
              hint={`${number.format(data.ai.tokens)} tokens · ${data.ai.failures} failed`}
              icon={<Bot size={18} />}
            />
            <KpiCard
              label="Estimated AI cost"
              value={usd.format(data.ai.estimatedCostUsd)}
              hint={data.ai.note}
              icon={<ShieldAlert size={18} />}
            />
          </div>

          {data.commercial ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Monthly recurring revenue"
                value={formatMoney(data.commercial.mrr, data.commercial.currency)}
                hint={`ARR ${formatMoney(data.commercial.arr, data.commercial.currency)}`}
                icon={<CreditCard size={18} />}
              />
              <KpiCard
                label="Subscriptions"
                value={number.format(data.commercial.subscriptions.active)}
                hint={`${data.commercial.subscriptions.trial} trial · ${data.commercial.subscriptions.pastDue} past due`}
                icon={<Repeat size={18} />}
              />
              <KpiCard
                label="Collected (30 days)"
                value={formatMoney(data.commercial.collectedRevenue, data.commercial.currency)}
                hint={`Outstanding: ${formatMoney(data.commercial.outstandingBalance, data.commercial.currency)}`}
                icon={<CreditCard size={18} />}
              />
              <KpiCard
                label="AI credit balance"
                value={number.format(data.ai.creditsRemaining ?? 0)}
                hint={`${number.format(data.ai.creditsConsumed ?? 0)} / ${number.format(data.ai.creditsAllocated ?? 0)} used`}
                icon={<Coins size={18} />}
              />
            </div>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Institutions by status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(Object.keys(data.institutions.byStatus) as InstitutionStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => go(`institutions?status=${status}`)}
                  className="rounded-lg border border-border px-3 py-2 text-left hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="block text-2xs text-muted-foreground">{institutionStatusLabels[status]}</span>
                  <span className="block text-lg font-semibold">{data.institutions.byStatus[status]}</span>
                </button>
              ))}
              <span className="rounded-lg border border-dashed border-border px-3 py-2">
                <span className="block text-2xs text-muted-foreground">Awaiting verification</span>
                <span className="block text-lg font-semibold">{data.institutions.pendingVerification}</span>
              </span>
            </CardContent>
          </Card>
        </>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Institution growth (12 months)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {trends.isError ? <ErrorState error={trends.error} /> : null}
            {trends.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.data} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(month) => monthLabel(String(month))} />
                  <Area type="monotone" dataKey="totalInstitutions" name="Institutions" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New users and AI requests per month</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {trends.data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.data} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(month) => monthLabel(String(month))} />
                  <Bar dataKey="newUsers" name="New users" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aiCalls" name="AI requests" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {data?.commercial ? (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Collected revenue & AI credits (12 months)</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => go('billing')}>
                Open billing
              </Button>
            </CardHeader>
            <CardContent className="h-64">
              {trends.data ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends.data} margin={{ left: -12, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={monthLabel} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(month) => monthLabel(String(month))} />
                    <Bar dataKey="revenueCollected" name="Revenue collected" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="aiCreditsUsed" name="AI credits used" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">MRR by subscription plan</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => go('plans')}>
                  Plans
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => go('subscriptions')}>
                  Subscriptions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.commercial.planDistribution.length === 0 ? (
                <EmptyState title="No active subscriptions yet" description="Assign a plan to an institution to see recurring revenue by tier." />
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {data.commercial.planDistribution.map((row) => (
                    <li key={row.planId} className="flex items-center justify-between py-2.5">
                      <span>
                        <span className="font-medium text-foreground">{row.planName}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {row.planCode} · {row.subscriptions} {row.subscriptions === 1 ? 'tenant' : 'tenants'}
                        </span>
                      </span>
                      <span className="font-semibold text-foreground">{formatMoney(row.mrr, data.commercial!.currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.isPending ? <LoadingRows rows={3} /> : null}
            {alerts.isError ? <ErrorState error={alerts.error} /> : null}
            {alerts.data?.length === 0 ? <EmptyState title="Nothing needs attention" /> : null}
            <ul className="space-y-2">
              {alerts.data?.map((alert, index) => (
                <li key={`${alert.type}-${index}`}>
                  <button
                    type="button"
                    disabled={!alert.link}
                    onClick={() => alert.link && go(alert.link)}
                    className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left text-sm hover:bg-muted/50 disabled:cursor-default"
                  >
                    {alert.severity === 'info' ? (
                      <Info size={16} className="mt-0.5 shrink-0 text-info" />
                    ) : (
                      <AlertTriangle size={16} className={alert.severity === 'critical' ? 'mt-0.5 shrink-0 text-destructive' : 'mt-0.5 shrink-0 text-warning'} />
                    )}
                    <span className="flex-1">{alert.message}</span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'warning' ? 'warning' : 'info'} className="capitalize">
                      {alert.severity}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.isPending ? <LoadingRows rows={4} /> : null}
            {activity.data?.length === 0 ? <EmptyState title="No activity yet" /> : null}
            <ul className="divide-y divide-border">
              {activity.data?.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{actionLabel(entry.action)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {entry.actor ?? 'System'}
                      {entry.institution ? ` · ${entry.institution}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(entry.at)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
