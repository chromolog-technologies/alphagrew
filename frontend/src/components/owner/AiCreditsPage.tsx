/** AI usage metering, institution credit wallets, append-only ledger, providers & rate cards (SRS §5.9). */
import { useState, type FormEvent } from 'react';
import { Bot, Coins, Plus, SlidersHorizontal } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  ownerApi,
  OWNER,
  useAiCreditLedger,
  useAiCredits,
  useAiProviders,
  useAiUsage,
  useInstitutions,
  useOwnerMutation,
  type AiCreditWallet,
} from '../../api/ownerApi';
import {
  CommercialStatusBadge,
  EmptyState,
  ErrorState,
  Field,
  formatDate,
  formatDateTime,
  KpiCard,
  LoadingRows,
  PageHeader,
  Pagination,
  errorMessage,
} from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function AiCreditsPage({ can }: OwnerPageProps) {
  const [tab, setTab] = useState('wallets');
  const [usagePage, setUsagePage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('');
  const [featureFilter, setFeatureFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [editingRateCard, setEditingRateCard] = useState(false);

  const institutions = useInstitutions({ perPage: 100 });
  const credits = useAiCredits();
  const usage = useAiUsage({
    page: usagePage,
    status: statusFilter || undefined,
    institutionId: institutionFilter || undefined,
    feature: featureFilter || undefined,
    provider: providerFilter || undefined,
    model: modelFilter || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    perPage: 25,
  });
  const providers = useAiProviders();
  const toggleRateMut = useOwnerMutation(({ id, isActive }: { id: number; isActive: boolean }) => ownerApi.updateAiRateCard(id, { isActive }));

  const canAllocate = can(OWNER.aiCredits);
  const canManage = can(OWNER.aiManage);

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI usage & credits"
        description="Institution credit wallets, append-only credit transaction ledger, provider status and service rate cards."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="wallets">Credit wallets & ledger</TabsTrigger>
          <TabsTrigger value="usage">Usage metering log</TabsTrigger>
          <TabsTrigger value="providers">Providers & rate cards</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="space-y-5 pt-4">
          {credits.isError ? <ErrorState error={credits.error} onRetry={() => void credits.refetch()} /> : null}
          {credits.isPending ? <LoadingRows rows={4} /> : null}
          {credits.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <KpiCard label="Total credits allocated" value={credits.data.summary.allocated.toLocaleString()} icon={<Coins size={18} />} />
                <KpiCard label="Total credits consumed" value={credits.data.summary.consumed.toLocaleString()} icon={<Bot size={18} />} />
                <KpiCard label="Remaining platform balance" value={credits.data.summary.remaining.toLocaleString()} />
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution</TableHead>
                        <TableHead>Allocated</TableHead>
                        <TableHead>Consumed</TableHead>
                        <TableHead>Remaining balance</TableHead>
                        <TableHead>Monthly quota &amp; policy</TableHead>
                        <TableHead className="text-right">Ledger</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credits.data.data.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell>
                            <span className="block font-medium">{w.institution?.name ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">{w.institution?.code}</span>
                          </TableCell>
                          <TableCell>{w.allocatedTotal.toLocaleString()}</TableCell>
                          <TableCell>
                            {w.consumedTotal.toLocaleString()} <span className="text-xs text-muted-foreground">({w.usedPercent}%)</span>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {w.balance.toLocaleString()} {w.thresholdExceeded ? <Badge variant="warning">Threshold</Badge> : null}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            Quota: {w.monthlyQuota ? w.monthlyQuota.toLocaleString() : 'Unlimited'} · {w.warningThresholdPercent}% warn · {w.hardStopOnExhaustion ? 'Hard stop' : 'Soft alert'}
                          </TableCell>
                          <TableCell className="text-right">
                            {w.institution ? (
                              <Button size="sm" variant="outline" onClick={() => setSelectedInstitutionId(w.institution!.id)}>
                                Ledger &amp; adjust
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4 pt-4">
          <div className="grid gap-2 md:grid-cols-6">
            <Select
              aria-label="Filter usage institution"
              value={institutionFilter}
              onChange={(e) => {
                setInstitutionFilter(e.target.value);
                setUsagePage(1);
              }}
            >
              <option value="">All institutions</option>
              {institutions.data?.data.map((inst) => (
                <option key={inst.id} value={String(inst.id)}>
                  {inst.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter usage service"
              value={featureFilter}
              onChange={(e) => {
                setFeatureFilter(e.target.value);
                setUsagePage(1);
              }}
            >
              <option value="">All services</option>
              {providers.data?.services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filter usage provider"
              value={providerFilter}
              onChange={(e) => {
                setProviderFilter(e.target.value);
                setUsagePage(1);
              }}
            >
              <option value="">All providers</option>
              {providers.data?.providers.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              aria-label="Filter usage model"
              placeholder="Model (e.g. claude)"
              value={modelFilter}
              onChange={(e) => {
                setModelFilter(e.target.value);
                setUsagePage(1);
              }}
            />
            <Select
              aria-label="Filter usage status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setUsagePage(1);
              }}
            >
              <option value="">All results</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="refused">Refused</option>
              <option value="invalid_output">Invalid output</option>
            </Select>
            <div className="flex items-center gap-1">
              <Input aria-label="Usage from date" type="date" value={fromDate} onChange={(e) => (setFromDate(e.target.value), setUsagePage(1))} />
              <Input aria-label="Usage to date" type="date" value={toDate} onChange={(e) => (setToDate(e.target.value), setUsagePage(1))} />
            </div>
          </div>

          {usage.isPending ? <LoadingRows rows={4} /> : null}
          {usage.data ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <KpiCard label="AI requests" value={usage.data.summary.calls.toLocaleString()} hint={`${usage.data.summary.failures} failed (uncharged by default)`} />
                <KpiCard label="Total tokens" value={usage.data.summary.tokens.toLocaleString()} />
                <KpiCard label="Credits charged" value={usage.data.summary.creditsCharged.toLocaleString()} />
                <KpiCard label="Estimated provider cost" value={`$${usage.data.summary.estimatedCostUsd.toFixed(4)}`} />
              </div>

              {usage.data.data.length === 0 ? (
                <EmptyState title="No metered AI usage logs yet" />
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Institution / User</TableHead>
                          <TableHead>Service / Feature</TableHead>
                          <TableHead>Provider / Model</TableHead>
                          <TableHead>Tokens</TableHead>
                          <TableHead>Latency</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Est. Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usage.data.data.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs">
                              <span className="block font-medium">{row.institution?.name ?? 'Platform'}</span>
                              <span className="text-muted-foreground">{row.user?.name ?? 'System'}</span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{row.feature}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.provider} / {row.model}
                            </TableCell>
                            <TableCell className="text-xs">{(row.promptTokens + row.completionTokens).toLocaleString()}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{row.latencyMs ? `${row.latencyMs} ms` : '—'}</TableCell>
                            <TableCell className="font-medium">{row.creditsCharged ?? 0}</TableCell>
                            <TableCell className="text-xs">${row.estimatedCostUsd.toFixed(4)}</TableCell>
                            <TableCell>
                              <CommercialStatusBadge status={row.status === 'success' ? 'succeeded' : 'failed'} />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
              <Pagination meta={usage.data.meta} onPage={setUsagePage} />
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="providers" className="space-y-5 pt-4">
          {providers.isPending ? <LoadingRows rows={3} /> : null}
          {providers.data ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {providers.data.providers.map((p) => (
                  <Card key={p.key}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm">{p.name}</CardTitle>
                      <Badge variant={p.configured ? 'success' : 'warning'}>{p.configured ? 'Configured' : 'Not configured'}</Badge>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs text-muted-foreground">
                      <p>Key: <span className="font-mono">{p.maskedKey ?? 'None (deterministic fallback active)'}</span></p>
                      <p>Models: {p.models.join(', ') || '—'} · Timeout: {p.timeoutSeconds}s</p>
                      {p.chain.length > 0 ? <p>Chain: <span className="font-mono">{p.chain.join(' → ')}</span></p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Service rate cards &amp; credit pricing</CardTitle>
                  {canManage ? (
                    <Button size="sm" variant="outline" onClick={() => setEditingRateCard(true)}>
                      <Plus size={12} /> Add / update rate card
                    </Button>
                  ) : null}
                </CardHeader>
                <CardContent className="p-0">
                  {providers.data.rateCards.length === 0 ? (
                    <div className="p-4"><EmptyState title="No custom rate cards configured" /></div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Provider / Model</TableHead>
                          <TableHead>Credits (Req / 1K)</TableHead>
                          <TableHead>USD / 1K In / Out</TableHead>
                          <TableHead>RPM / Warn %</TableHead>
                          <TableHead>Charge Failed</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {providers.data.rateCards.map((rc) => (
                          <TableRow key={rc.id}>
                            <TableCell className="font-mono text-xs font-medium">{rc.serviceKey}</TableCell>
                            <TableCell className="text-xs">{rc.provider} / {rc.model}</TableCell>
                            <TableCell className="text-xs">
                              {rc.creditsPerRequest} / {rc.creditsPer1kTokens}
                            </TableCell>
                            <TableCell className="text-xs">
                              ${rc.usdPer1kInputTokens} / ${rc.usdPer1kOutputTokens}
                            </TableCell>
                            <TableCell className="text-xs">
                              {rc.rateLimitPerMinute ?? '∞'} / {rc.warningThresholdPercent}%
                            </TableCell>
                            <TableCell className="text-xs">{rc.chargeOnFailure ? 'Yes' : 'No'}</TableCell>
                            <TableCell className="space-x-1 text-right">
                              <Badge variant={rc.isActive ? 'success' : 'secondary'}>{rc.isActive ? 'Active' : 'Disabled'}</Badge>
                              {canManage ? (
                                <Button size="sm" variant="ghost" onClick={() => void toggleRateMut.mutateAsync({ id: rc.id, isActive: !rc.isActive })}>
                                  {rc.isActive ? 'Disable' : 'Enable'}
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      {selectedInstitutionId ? (
        <WalletLedgerDialog
          institutionId={selectedInstitutionId}
          canAllocate={canAllocate}
          canManage={canManage}
          onClose={() => setSelectedInstitutionId(null)}
        />
      ) : null}

      {editingRateCard && providers.data ? (
        <RateCardDialog services={providers.data.services} onClose={() => setEditingRateCard(false)} />
      ) : null}
    </div>
  );
}

function WalletLedgerDialog({
  institutionId,
  canAllocate,
  canManage,
  onClose,
}: {
  institutionId: number;
  canAllocate: boolean;
  canManage: boolean;
  onClose: () => void;
}) {
  const ledger = useAiCreditLedger(institutionId);
  const [txType, setTxType] = useState<'bonus' | 'purchased' | 'manual_adjustment' | 'reversal' | 'expiry'>('bonus');
  const [delta, setDelta] = useState(500);
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [monthlyQuotaInput, setMonthlyQuotaInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const adjustMut = useOwnerMutation(ownerApi.adjustAiCredits);
  const policyMut = useOwnerMutation((input: { monthlyQuota?: number | null; threshold: number; hardStop: boolean; chargeFailed: boolean }) =>
    ownerApi.updateAiWalletPolicy(institutionId, {
      monthlyQuota: input.monthlyQuota,
      warningThresholdPercent: input.threshold,
      hardStopOnExhaustion: input.hardStop,
      chargeFailedRequests: input.chargeFailed,
    }),
  );

  const submitAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await adjustMut.mutateAsync({
        institutionId,
        transactionType: txType,
        creditsDelta: delta,
        reason,
        expiresAt: expiresAt || undefined,
      });
      setReason('');
      setExpiresAt('');
    } catch (error) {
      setErrorMsg(errorMessage(error));
    }
  };

  const w: AiCreditWallet | undefined = ledger.data?.wallet;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{w?.institution?.name ?? 'Credit wallet'} — Ledger</DialogTitle>
          <DialogDescription>Append-only AI credit transactions, monthly quotas, and warning thresholds.</DialogDescription>
        </DialogHeader>

        {ledger.isPending ? <LoadingRows rows={3} /> : null}
        {w ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-lg border border-border p-2.5"><span className="block text-xs text-muted-foreground">Balance</span><span className="text-lg font-semibold">{w.balance.toLocaleString()}</span></div>
              <div className="rounded-lg border border-border p-2.5"><span className="block text-xs text-muted-foreground">Allocated</span><span className="text-lg font-semibold">{w.allocatedTotal.toLocaleString()}</span></div>
              <div className="rounded-lg border border-border p-2.5"><span className="block text-xs text-muted-foreground">Consumed</span><span className="text-lg font-semibold">{w.consumedTotal.toLocaleString()}</span></div>
              <div className="rounded-lg border border-border p-2.5"><span className="block text-xs text-muted-foreground">Monthly quota</span><span className="text-lg font-semibold">{w.monthlyQuota ? w.monthlyQuota.toLocaleString() : '∞'}</span></div>
            </div>

            {canManage ? (
              <div className="flex flex-wrap items-end justify-between gap-2 rounded-lg border border-border p-3 text-xs">
                <Field label="Update monthly quota (blank = unlimited)">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="w-40"
                      placeholder={w.monthlyQuota ? String(w.monthlyQuota) : 'Unlimited'}
                      value={monthlyQuotaInput}
                      onChange={(e) => setMonthlyQuotaInput(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={policyMut.isPending}
                      onClick={() =>
                        void policyMut.mutateAsync({
                          monthlyQuota: monthlyQuotaInput === '' ? null : Number(monthlyQuotaInput),
                          threshold: w.warningThresholdPercent,
                          hardStop: w.hardStopOnExhaustion,
                          chargeFailed: w.chargeFailedRequests,
                        })
                      }
                    >
                      Save quota
                    </Button>
                  </div>
                </Field>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void policyMut.mutateAsync({
                      monthlyQuota: w.monthlyQuota,
                      threshold: w.warningThresholdPercent,
                      hardStop: !w.hardStopOnExhaustion,
                      chargeFailed: w.chargeFailedRequests,
                    })
                  }
                >
                  <SlidersHorizontal size={12} /> {w.hardStopOnExhaustion ? 'Disable hard stop' : 'Enable hard stop'}
                </Button>
              </div>
            ) : null}

            {canAllocate ? (
              <form onSubmit={(e) => void submitAdjustment(e)} className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs font-semibold">Post credit adjustment</p>
                {errorMsg ? <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert> : null}
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Transaction type">
                    <Select value={txType} onChange={(e) => setTxType(e.target.value as typeof txType)}>
                      <option value="bonus">Bonus credits (+)</option>
                      <option value="purchased">Purchased top-up (+)</option>
                      <option value="manual_adjustment">Manual adjustment (+/-)</option>
                      <option value="reversal">Reversal (+)</option>
                      <option value="expiry">Expiry (-)</option>
                    </Select>
                  </Field>
                  <Field label="Credits delta">
                    <Input type="number" step="0.01" required value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
                  </Field>
                  <Field label="Expires on (optional)">
                    <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                  </Field>
                </div>
                <Field label="Reason (required for audit trail)">
                  <Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Placement season top-up" />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={adjustMut.isPending}>Post ledger entry</Button>
                </div>
              </form>
            ) : null}

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Transaction history</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Balance after</TableHead>
                      <TableHead>Reason / Expiry</TableHead>
                      <TableHead>Actor / When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.data?.data.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs font-medium capitalize">{tx.type.replace(/_/g, ' ')}</TableCell>
                        <TableCell className={tx.creditsDelta >= 0 ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'}>
                          {tx.creditsDelta >= 0 ? `+${tx.creditsDelta}` : tx.creditsDelta}
                        </TableCell>
                        <TableCell className="text-xs">{tx.balanceAfter}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.reason ?? '—'}
                          {tx.expiresAt ? <span className="block text-2xs">Exp: {formatDate(tx.expiresAt)}</span> : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{tx.actor} · {formatDateTime(tx.at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RateCardDialog({ services, onClose }: { services: string[]; onClose: () => void }) {
  const [serviceKey, setServiceKey] = useState(services[0] ?? 'resume_analysis');
  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('claude-opus-5-5');
  const [creditsPerRequest, setCreditsPerRequest] = useState(2);
  const [creditsPer1kTokens, setCreditsPer1kTokens] = useState(0.5);
  const [usdPer1kInputTokens, setUsdPer1kInputTokens] = useState(0.004);
  const [usdPer1kOutputTokens, setUsdPer1kOutputTokens] = useState(0.02);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState<string>('60');
  const [warningThresholdPercent, setWarningThresholdPercent] = useState(80);
  const [chargeOnFailure, setChargeOnFailure] = useState(false);
  const mut = useOwnerMutation(ownerApi.saveAiRateCard);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await mut.mutateAsync({
      serviceKey,
      provider,
      model,
      creditsPerRequest,
      creditsPer1kTokens,
      usdPer1kInputTokens,
      usdPer1kOutputTokens,
      rateLimitPerMinute: rateLimitPerMinute === '' ? null : Number(rateLimitPerMinute),
      warningThresholdPercent,
      chargeOnFailure,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto" onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Save AI service rate card</DialogTitle>
          <DialogDescription>Configure credit charges, provider USD estimates, rate limits, and thresholds.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <Field label="Service">
            <Select value={serviceKey} onChange={(e) => setServiceKey(e.target.value)}>
              {services.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Provider"><Input required value={provider} onChange={(e) => setProvider(e.target.value)} /></Field>
            <Field label="Model"><Input required value={model} onChange={(e) => setModel(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Credits / request"><Input type="number" step="0.01" min={0} required value={creditsPerRequest} onChange={(e) => setCreditsPerRequest(Number(e.target.value))} /></Field>
            <Field label="Credits / 1K tokens"><Input type="number" step="0.01" min={0} required value={creditsPer1kTokens} onChange={(e) => setCreditsPer1kTokens(Number(e.target.value))} /></Field>
            <Field label="USD / 1K input tokens"><Input type="number" step="0.0001" min={0} value={usdPer1kInputTokens} onChange={(e) => setUsdPer1kInputTokens(Number(e.target.value))} /></Field>
            <Field label="USD / 1K output tokens"><Input type="number" step="0.0001" min={0} value={usdPer1kOutputTokens} onChange={(e) => setUsdPer1kOutputTokens(Number(e.target.value))} /></Field>
            <Field label="Rate limit (req/min)"><Input type="number" min={1} placeholder="Unlimited" value={rateLimitPerMinute} onChange={(e) => setRateLimitPerMinute(e.target.value)} /></Field>
            <Field label="Warning threshold (%)"><Input type="number" min={1} max={100} value={warningThresholdPercent} onChange={(e) => setWarningThresholdPercent(Number(e.target.value))} /></Field>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={chargeOnFailure} onChange={(e) => setChargeOnFailure(e.target.checked)} />
            <span>Charge credits when requests fail (disabled by default per SRS FR-AI-008)</span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save rate card</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

