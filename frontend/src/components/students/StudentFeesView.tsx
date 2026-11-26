/** A student's own fees: dues, what is paid, and the receipts of recorded payments. */
import { ApiError } from '../../api/apiError';
import { formatMoney, useMyFees } from '../../api/feesApi';
import { Alert, AlertDescription, Badge, Card, Skeleton } from '../ui';

export function StudentFeesView() {
  const fees = useMyFees();

  if (fees.isLoading) return <Skeleton className="h-40 w-full" />;
  if (fees.error || !fees.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{fees.error instanceof ApiError ? fees.error.message : 'Your fees could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const rows = fees.data.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">My fees</h1>
        <p className="text-sm text-muted-foreground">Total outstanding: {formatMoney(fees.data.meta.totalDue)}. Pay at the accounts office; payments appear here with their receipt numbers.</p>
      </div>
      {rows.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No fees have been billed to you.</Card>
      ) : (
        rows.map((f) => (
          <Card key={f.id} className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold">
                {f.feeStructure?.course?.code} · Semester {f.feeStructure?.semester}
              </p>
              <Badge variant={f.status === 'paid' ? 'success' : f.status === 'overdue' ? 'destructive' : 'warning'}>{f.status}</Badge>
            </div>
            <p className="text-muted-foreground">
              Due {formatMoney(f.amountDue)} by {f.dueDate} · Paid {formatMoney(f.amountPaid)} · Balance {formatMoney(f.balance)}
            </p>
            {(f.payments ?? []).length > 0 ? (
              <ul className="space-y-1" aria-label={`Receipts for semester ${f.feeStructure?.semester}`}>
                {(f.payments ?? []).map((p) => (
                  <li key={p.id} className="flex justify-between text-xs">
                    <span>
                      {p.receiptNumber} · {p.paidOn} · {p.method}
                    </span>
                    <span>{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ))
      )}
    </div>
  );
}
