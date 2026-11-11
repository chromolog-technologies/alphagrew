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
  useOwnerMutation,
  type AiCreditWallet,
} from '../../api/ownerApi';
import {
  CommercialStatusBadge,
  EmptyState,
  ErrorState,
  Field,
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
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<number | null>(null);
  const [editingRateCard, setEditingRateCard] = useState(false);

  const credits = useAiCredits();
  const usage = useAiUsage({ page: usagePage, status: statusFilter, perPage: 25 });
  const providers = useAiProviders();

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
                        <TableHead>Warning threshold</TableHead>
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
                            {w.warningThresholdPercent}% · {w.hardStopOnExhaustion ? 'Hard stop' : 'Soft alert'}
                          </TableCell>
                          <TableCell className="text-right">
                            {w.institution ? (
                              <Button size="sm" variant="outline" onClick={() => setSelectedInstitutionId(w.institution!.id)}>
                                Ledger & adjust
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
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="w-44"
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
                          <TableHead>Institution</TableHead>
                          <TableHead>Service / Feature</TableHead>
                          <TableHead>Provider / Model</TableHead>
                          <TableHead>Tokens</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Est. Cost</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>When</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usage.data.data.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-xs font-medium">{row.institution?.name ?? 'Platform'}</TableCell>
                            <TableCell className="font-mono text-xs">{row.feature}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {row.provider} / {row.model}
                            </TableCell>
                            <TableCell className="text-xs">{(row.promptTokens + row.completionTokens).toLocaleString()}</TableCell>
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
                      <p>Models: {p.models.join(', ') || '—'}</p>
                      {p.chain.length > 0 ? <p>Chain: <span className="font-mono">{p.chain.join(' → ')}</span></p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm">Service rate cards & credit pricing</CardTitle>
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
                          <TableHead>Credits / Req</TableHead>
                          <TableHead>Credits / 1K Tok</TableHead>
                          <TableHead>Charge Failed</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {providers.data.rateCards.map((rc) => (
                          <TableRow key={rc.id}>
                            <TableCell className="font-mono text-xs font-medium">{rc.serviceKey}</TableCell>
                            <TableCell className="text-xs">{rc.provider} / {rc.model}</TableCell>
                            <TableCell>{rc.creditsPerRequest}</TableCell>
                            <TableCell>{rc.creditsPer1kTokens}</TableCell>
                            <TableCell>{rc.chargeOnFailure ? 'Yes' : 'No'}</TableCell>
                            <TableCell><Badge variant={rc.isActive ? 'success' : 'secondary'}>{rc.isActive ? 'Active' : 'Disabled'}</Badge></TableCell>
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
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const adjustMut = useOwnerMutation(ownerApi.adjustAiCredits);
  const policyMut = useOwnerMutation((input: { threshold: number; hardStop: boolean; chargeFailed: boolean }) =>
    ownerApi.updateAiWalletPolicy(institutionId, {
      warningThresholdPercent: input.threshold,
      hardStopOnExhaustion: input.hardStop,
      chargeFailedRequests: input.chargeFailed,
    }),
  );

  const submitAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await adjustMut.mutateAsync({ institutionId, transactionType: txType, creditsDelta: delta, reason });
      setReason('');
    } catch (error) {
      setErrorMsg(errorMessage(error));
    }
  };

  const w: AiCreditWallet | undefined = ledger.data?.wallet;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{w?.institution?.name ?? 'Credit wallet'} — Ledger</DialogTitle>
          <DialogDescription>Append-only AI credit transactions and warning thresholds.</DialogDescription>
        </DialogHeader>

        {ledger.isPending ? <LoadingRows rows={3} /> : null}
        {w ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border p-2.5"><span className="block text-xs text-muted-foreground">Balance</span><span className="text-lg font-semibold">{w.balance.toLocaleString()}</span></div>
              <div className="rounded-lg border border-border p-2.5"><span className="block text-xs text-muted-foreground">Allocated</span><span className="text-lg font-semibold">{w.allocatedTotal.toLocaleString()}</span></div>
              <div className="rounded-lg border border-border p-2.5"><span className="block text-xs text-muted-foreground">Consumed</span><span className="text-lg font-semibold">{w.consumedTotal.toLocaleString()}</span></div>
            </div>

            {canAllocate ? (
              <form onSubmit={(e) => void submitAdjustment(e)} className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-xs font-semibold">Post credit adjustment</p>
                {errorMsg ? <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert> : null}
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <Field label="Reason (required for audit trail)">
                  <Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Placement season top-up" />
                </Field>
                <div className="flex justify-between">
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void policyMut.mutateAsync({ threshold: w.warningThresholdPercent, hardStop: !w.hardStopOnExhaustion, chargeFailed: w.chargeFailedRequests })}
                    >
                      <SlidersHorizontal size={12} /> {w.hardStopOnExhaustion ? 'Disable hard stop' : 'Enable hard stop'}
                    </Button>
                  ) : <span />}
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
                      <TableHead>Reason</TableHead>
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
                        <TableCell className="text-xs text-muted-foreground">{tx.reason ?? '—'}</TableCell>
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
  const [chargeOnFailure, setChargeOnFailure] = useState(false);
  const mut = useOwnerMutation(ownerApi.saveAiRateCard);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await mut.mutateAsync({ serviceKey, provider, model, creditsPerRequest, creditsPer1kTokens, chargeOnFailure });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save AI service rate card</DialogTitle>
          <DialogDescription>Configure credit charges per service and model.</DialogDescription>
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

