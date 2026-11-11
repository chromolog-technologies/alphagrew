/** Billing, invoices, payments, refunds, tax/GST profiles & coupons (SRS §5.8). */
import { useState, type FormEvent } from 'react';
import { CreditCard, Download, Plus, ReceiptText, RotateCcw } from 'lucide-react';
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
import { downloadFile, isApiConfigured } from '../../api/http';
import {
  ownerApi,
  OWNER,
  useCoupons,
  useInstitutions,
  useInvoices,
  useOwnerMutation,
  usePayments,
  useRefunds,
  useRevenueSummary,
  useTaxProfiles,
  type Invoice,
  type Payment,
} from '../../api/ownerApi';
import {
  CommercialStatusBadge,
  EmptyState,
  ErrorState,
  Field,
  formatDate,
  formatDateTime,
  formatMoney,
  KpiCard,
  LoadingRows,
  PageHeader,
  Pagination,
  errorMessage,
} from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function BillingPage({ can }: OwnerPageProps) {
  const [tab, setTab] = useState('revenue');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);

  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [refundingPayment, setRefundingPayment] = useState<Payment | null>(null);
  const [creatingTax, setCreatingTax] = useState(false);
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [actionError, setActionError] = useState('');

  const revenue = useRevenueSummary();
  const invoices = useInvoices({ status: invoiceStatus, page: invoicePage, perPage: 20 });
  const payments = usePayments({ page: paymentPage, perPage: 20 });
  const refunds = useRefunds({ page: refundPage, perPage: 20 });
  const taxProfiles = useTaxProfiles();
  const coupons = useCoupons();

  const canManage = can(OWNER.billingManage);
  const canRefund = can(OWNER.billingRefund);

  const issueMut = useOwnerMutation((id: number) => ownerApi.issueInvoice(id));
  const voidMut = useOwnerMutation((id: number) => ownerApi.voidInvoice(id, 'Voided by operator'));
  const approveRefundMut = useOwnerMutation((id: number) => ownerApi.approveRefund(id));
  const executeRefundMut = useOwnerMutation((id: number) => ownerApi.executeRefund(id));

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try {
      await fn();
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const downloadInvoice = async (invoice: Invoice) => {
    setActionError('');
    if (!isApiConfigured()) {
      setActionError('Invoice download requires the live Laravel backend.');
      return;
    }
    try {
      await downloadFile(`/owner/invoices/${invoice.id}/download`, {}, `invoice-${invoice.invoiceNumber}.html`);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  const rev = revenue.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & revenue"
        description="MRR/ARR tracking, GST-compliant invoicing, idempotent payment reconciliation, two-step refunds and promotional coupons."
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setCreatingInvoice(true)}>
              <Plus size={14} /> New invoice
            </Button>
          ) : null
        }
      />

      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="revenue">Revenue summary</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="config">Tax & coupons</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-5 pt-4">
          {revenue.isError ? <ErrorState error={revenue.error} onRetry={() => void revenue.refetch()} /> : null}
          {revenue.isPending ? <LoadingRows rows={3} /> : null}
          {rev ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard label="MRR" value={formatMoney(rev.mrr, rev.currency)} hint={`${rev.subscriptions.active} active · ${rev.subscriptions.trial} trial`} />
                <KpiCard label="ARR" value={formatMoney(rev.arr, rev.currency)} hint={`Conversion ${rev.subscriptions.trialConversionRate}% · Churn ${rev.subscriptions.churnRate}%`} />
                <KpiCard label="Invoiced (period)" value={formatMoney(rev.invoiced, rev.currency)} />
                <KpiCard label="Collected (net)" value={formatMoney(rev.collected, rev.currency)} hint={`Refunded: ${formatMoney(rev.refunded, rev.currency)}`} />
                <KpiCard label="Outstanding balance" value={formatMoney(rev.outstanding, rev.currency)} hint={`${rev.subscriptions.pastDue} past-due subscriptions`} />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">MRR by plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rev.byPlan.length === 0 ? (
                      <EmptyState title="No paying subscriptions" />
                    ) : (
                      <ul className="divide-y divide-border text-sm">
                        {rev.byPlan.map((row) => (
                          <li key={row.planId} className="flex items-center justify-between py-2">
                            <span>
                              <span className="font-medium">{row.planName}</span>{' '}
                              <span className="text-xs text-muted-foreground">({row.subscriptions} active)</span>
                            </span>
                            <span className="font-medium">{formatMoney(row.mrr, rev.currency)} / mo</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top institutions by invoiced revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {rev.byInstitution.length === 0 ? (
                      <EmptyState title="No invoices yet" />
                    ) : (
                      <ul className="divide-y divide-border text-sm">
                        {rev.byInstitution.map((row) => (
                          <li key={row.institutionId} className="flex items-center justify-between py-2">
                            <span>
                              <span className="font-medium">{row.institutionName}</span>{' '}
                              <span className="text-xs text-muted-foreground">{row.code}</span>
                            </span>
                            <span className="text-right text-xs">
                              <span className="block font-medium text-foreground">{formatMoney(row.paid, rev.currency)} paid</span>
                              {row.outstanding > 0 ? (
                                <span className="text-amber-600">{formatMoney(row.outstanding, rev.currency)} due</span>
                              ) : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="w-44"
              aria-label="Filter invoice status"
              value={invoiceStatus}
              onChange={(e) => {
                setInvoiceStatus(e.target.value);
                setInvoicePage(1);
              }}
            >
              <option value="">All invoice statuses</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="void">Void</option>
            </Select>
          </div>

          {invoices.isError ? <ErrorState error={invoices.error} /> : null}
          {invoices.isPending ? <LoadingRows rows={4} /> : null}
          {invoices.data && invoices.data.data.length === 0 ? <EmptyState title="No invoices found" /> : null}
          {invoices.data && invoices.data.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.data.data.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>
                          <span className="block font-medium">{inv.institution?.name ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">{inv.taxRatePercent > 0 ? `Tax ${inv.taxRatePercent}%` : 'No tax'}</span>
                        </TableCell>
                        <TableCell>
                          <CommercialStatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell>{formatMoney(inv.total, inv.currency)}</TableCell>
                        <TableCell className="font-medium">{formatMoney(inv.balance, inv.currency)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(inv.dueAt)}</TableCell>
                        <TableCell className="space-x-1 text-right">
                          {canManage && inv.status === 'draft' ? (
                            <Button size="sm" variant="outline" onClick={() => void runAction(() => issueMut.mutateAsync(inv.id))}>
                              Issue
                            </Button>
                          ) : null}
                          {canManage && inv.balance > 0 && inv.status !== 'void' ? (
                            <Button size="sm" variant="outline" onClick={() => setPayingInvoice(inv)}>
                              <CreditCard size={12} /> Record payment
                            </Button>
                          ) : null}
                          {canManage && inv.paidAmount === 0 && inv.status !== 'void' ? (
                            <Button size="sm" variant="ghost" onClick={() => void runAction(() => voidMut.mutateAsync(inv.id))}>
                              Void
                            </Button>
                          ) : null}
                          <Button size="sm" variant="ghost" aria-label={`Download ${inv.invoiceNumber}`} onClick={() => void downloadInvoice(inv)}>
                            <Download size={13} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
          {invoices.data ? <Pagination meta={invoices.data.meta} onPage={setInvoicePage} /> : null}
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 pt-4">
          {payments.isPending ? <LoadingRows rows={4} /> : null}
          {payments.data && payments.data.data.length === 0 ? <EmptyState title="No payments recorded" /> : null}
          {payments.data && payments.data.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Gateway / Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.data.data.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.paymentReference ?? '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{p.invoiceNumber ?? `#${p.invoiceId}`}</TableCell>
                        <TableCell>{p.institution?.name ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.gateway} · {p.method}
                        </TableCell>
                        <TableCell>
                          <span className="block font-medium">{formatMoney(p.amount, p.currency)}</span>
                          {p.refundedAmount > 0 ? <span className="text-xs text-muted-foreground">Refunded: {formatMoney(p.refundedAmount, p.currency)}</span> : null}
                        </TableCell>
                        <TableCell>
                          <CommercialStatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage && p.refundableAmount > 0 ? (
                            <Button size="sm" variant="outline" onClick={() => setRefundingPayment(p)}>
                              <RotateCcw size={12} /> Refund
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
          {payments.data ? <Pagination meta={payments.data.meta} onPage={setPaymentPage} /> : null}
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4 pt-4">
          {refunds.isPending ? <LoadingRows rows={4} /> : null}
          {refunds.data && refunds.data.data.length === 0 ? <EmptyState title="No refund requests" /> : null}
          {refunds.data && refunds.data.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Workflow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.data.data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.invoiceNumber ?? '—'}</TableCell>
                        <TableCell>{r.institution?.name ?? '—'}</TableCell>
                        <TableCell className="font-medium">{formatMoney(r.amount, r.currency)}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.reason}</TableCell>
                        <TableCell>
                          <CommercialStatusBadge status={r.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(r.executedAt ?? r.approvedAt ?? r.createdAt)}</TableCell>
                        <TableCell className="space-x-1 text-right">
                          {canRefund && r.status === 'requested' ? (
                            <Button size="sm" variant="outline" onClick={() => void runAction(() => approveRefundMut.mutateAsync(r.id))}>
                              Approve
                            </Button>
                          ) : null}
                          {canRefund && (r.status === 'requested' || r.status === 'approved') ? (
                            <Button size="sm" onClick={() => void runAction(() => executeRefundMut.mutateAsync(r.id))}>
                              Execute
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
          {refunds.data ? <Pagination meta={refunds.data.meta} onPage={setRefundPage} /> : null}
        </TabsContent>

        <TabsContent value="config" className="grid gap-5 pt-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Tax / GST profiles</CardTitle>
              {canManage ? (
                <Button size="sm" variant="outline" onClick={() => setCreatingTax(true)}>
                  <Plus size={12} /> Add tax profile
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {taxProfiles.data?.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-medium">{t.name}</span>{' '}
                      {t.isDefault ? <Badge variant="info">Default</Badge> : null}
                      <span className="block text-xs text-muted-foreground">
                        {t.taxType.toUpperCase()} · {t.ratePercent}%{t.gstin ? ` · GSTIN: ${t.gstin}` : ''}
                      </span>
                    </div>
                    <Badge variant={t.isActive ? 'success' : 'secondary'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">Coupons & promotions</CardTitle>
              {canManage ? (
                <Button size="sm" variant="outline" onClick={() => setCreatingCoupon(true)}>
                  <Plus size={12} /> Add coupon
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border text-sm">
                {coupons.data?.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-mono text-xs font-semibold">{c.code}</span> · <span className="font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.discountType === 'percent' ? `${c.discountValue}% off` : `${formatMoney(c.discountValue, c.currency ?? 'INR')} off`} · Redeemed {c.redemptionsCount}
                        {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ''}
                      </span>
                    </div>
                    <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {creatingInvoice ? <CreateInvoiceDialog onClose={() => setCreatingInvoice(false)} /> : null}
      {payingInvoice ? <RecordPaymentDialog invoice={payingInvoice} onClose={() => setPayingInvoice(null)} /> : null}
      {refundingPayment ? <RequestRefundDialog payment={refundingPayment} onClose={() => setRefundingPayment(null)} /> : null}
      {creatingTax ? <CreateTaxProfileDialog onClose={() => setCreatingTax(false)} /> : null}
      {creatingCoupon ? <CreateCouponDialog onClose={() => setCreatingCoupon(false)} /> : null}
    </div>
  );
}

function CreateInvoiceDialog({ onClose }: { onClose: () => void }) {
  const institutions = useInstitutions({ perPage: 100 });
  const taxProfiles = useTaxProfiles();
  const [institutionId, setInstitutionId] = useState('');
  const [taxProfileId, setTaxProfileId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [description, setDescription] = useState('Platform Subscription');
  const [unitPrice, setUnitPrice] = useState(14999);
  const [errorMsg, setErrorMsg] = useState('');
  const createMut = useOwnerMutation(ownerApi.createInvoice);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await createMut.mutateAsync({
        institutionId: Number(institutionId),
        taxProfileId: taxProfileId ? Number(taxProfileId) : null,
        couponCode: couponCode.trim() || undefined,
        issueImmediately: true,
        items: [{ description, quantity: 1, unitPrice, itemType: 'subscription' }],
      });
      onClose();
    } catch (error) {
      setErrorMsg(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ReceiptText size={16} /> Create invoice</DialogTitle>
          <DialogDescription>Issues a numbered invoice with optional tax profile and coupon discount.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {errorMsg ? <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert> : null}
          <Field label="Institution">
            <Select required value={institutionId} onChange={(e) => setInstitutionId(e.target.value)}>
              <option value="">Select institution...</option>
              {institutions.data?.data.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
            </Select>
          </Field>
          <Field label="Line item description">
            <Input required value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input type="number" min={1} step="0.01" required value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
            </Field>
            <Field label="Coupon code (optional)">
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="LAUNCH20" />
            </Field>
          </div>
          <Field label="Tax profile">
            <Select value={taxProfileId} onChange={(e) => setTaxProfileId(e.target.value)}>
              <option value="">Default tax profile</option>
              {taxProfiles.data?.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.ratePercent}%)</option>)}
            </Select>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createMut.isPending}>Generate & issue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [amount, setAmount] = useState(invoice.balance);
  const [gateway, setGateway] = useState('manual');
  const [method, setMethod] = useState('bank_transfer');
  const [gatewayEventId, setGatewayEventId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const payMut = useOwnerMutation(ownerApi.recordPayment);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await payMut.mutateAsync({ invoiceId: invoice.id, amount, gateway, method, status: 'succeeded', gatewayEventId: gatewayEventId || undefined });
      onClose();
    } catch (error) {
      setErrorMsg(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment for {invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>Remaining balance: {formatMoney(invoice.balance, invoice.currency)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {errorMsg ? <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert> : null}
          <Field label="Amount">
            <Input type="number" step="0.01" min={0.01} max={invoice.balance} required value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gateway">
              <Select value={gateway} onChange={(e) => setGateway(e.target.value)}>
                <option value="manual">Manual / Wire</option>
                <option value="razorpay">Razorpay</option>
                <option value="stripe">Stripe</option>
              </Select>
            </Field>
            <Field label="Method">
              <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="bank_transfer">Bank transfer / NEFT</option>
                <option value="upi_emandate">UPI / eMandate</option>
                <option value="card">Card</option>
              </Select>
            </Field>
          </div>
          <Field label="Idempotency / event ID (optional)">
            <Input value={gatewayEventId} onChange={(e) => setGatewayEventId(e.target.value)} placeholder="evt_..." />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={payMut.isPending}>Save payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestRefundDialog({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const [amount, setAmount] = useState(payment.refundableAmount);
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const mut = useOwnerMutation(ownerApi.requestRefund);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await mut.mutateAsync({ paymentId: payment.id, amount, reason });
      onClose();
    } catch (error) {
      setErrorMsg(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request refund ({payment.paymentReference})</DialogTitle>
          <DialogDescription>Refundable balance: {formatMoney(payment.refundableAmount, payment.currency)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {errorMsg ? <Alert variant="destructive"><AlertDescription>{errorMsg}</AlertDescription></Alert> : null}
          <Field label="Refund amount">
            <Input type="number" step="0.01" min={0.01} max={payment.refundableAmount} required value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </Field>
          <Field label="Reason">
            <Input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain refund justification..." />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Submit request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateTaxProfileDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [ratePercent, setRatePercent] = useState(18);
  const [gstin, setGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const mut = useOwnerMutation(ownerApi.createTaxProfile);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await mut.mutateAsync({ code, name, taxType: 'gst', ratePercent, gstin: gstin || undefined, placeOfSupply: placeOfSupply || undefined });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New tax profile</DialogTitle></DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="GST18" /></Field>
            <Field label="Rate (%)"><Input type="number" step="0.01" min={0} max={100} required value={ratePercent} onChange={(e) => setRatePercent(Number(e.target.value))} /></Field>
          </div>
          <Field label="Name"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="India GST 18%" /></Field>
          <Field label="GSTIN"><Input value={gstin} onChange={(e) => setGstin(e.target.value)} /></Field>
          <Field label="Place of supply"><Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateCouponDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(10);
  const mut = useOwnerMutation(ownerApi.createCoupon);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await mut.mutateAsync({ code, name, discountType, discountValue });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New discount coupon</DialogTitle></DialogHeader>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <Field label="Code"><Input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME15" /></Field>
          <Field label="Name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed amount</option>
              </Select>
            </Field>
            <Field label="Value"><Input type="number" step="0.01" min={0.01} required value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

