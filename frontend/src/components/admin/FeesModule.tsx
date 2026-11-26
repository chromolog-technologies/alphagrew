/**
 * Campus fees (record-keeping): fee structures per course semester, billing a class, and the
 * dues of each student with payments recorded by staff (receipt per payment, voids instead of
 * deletes). Online payment is not part of this module.
 */
import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Receipt, Trash2, Users } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { apiCall } from '../../api/apiClient';
import { useAcademicYears, useClasses } from '../../api/academicsApi';
import {
  formatMoney,
  PAYMENT_METHODS,
  useAssignFeeStructure,
  useDeleteFeeStructure,
  useFeeStructures,
  useRecordPayment,
  useSaveFeeStructure,
  useStudentFee,
  useStudentFees,
  useVoidPayment,
  type FeeStatus,
  type FeeStructure,
  type PaymentMethod,
} from '../../api/feesApi';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui';

type Option = { id: number; name: string; code?: string };
const asList = (response: unknown): Option[] =>
  (Array.isArray(response) ? response : Array.isArray((response as { data?: unknown })?.data) ? (response as { data: Option[] }).data : []) as Option[];
const errorText = (error: unknown) =>
  error instanceof ApiError ? Object.values(error.firstFieldErrors)[0] ?? error.message : error ? 'The change could not be saved.' : null;

const statusVariant: Record<FeeStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = { paid: 'success', partial: 'warning', overdue: 'destructive', pending: 'secondary' };

type StructureDraft = {
  id: number | null; academicYearId: string; courseId: string; semester: string; tuitionFee: string; labFee: string;
  libraryFee: string; examFee: string; otherFee: string; dueDate: string;
};

export function FeesModule({ canManage = true }: { canManage?: boolean }) {
  const [tab, setTab] = useState<'structures' | 'dues'>('structures');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Fees</h1>
        <p className="text-sm text-muted-foreground">Fee structures, student dues and recorded payments. Online payment is not enabled.</p>
      </div>
      <div className="flex gap-2 border-b border-border" role="tablist">
        {(
          [
            ['structures', 'Fee structures'],
            ['dues', 'Student dues'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'structures' ? <Structures canManage={canManage} /> : <Dues canManage={canManage} />}
    </div>
  );
}

function Structures({ canManage }: { canManage: boolean }) {
  const structures = useFeeStructures();
  const years = useAcademicYears();
  const classes = useClasses();
  const courses = useQuery({ queryKey: ['courses', 'options'], queryFn: () => apiCall('/courses').then(asList) });
  const save = useSaveFeeStructure();
  const remove = useDeleteFeeStructure();
  const assign = useAssignFeeStructure();
  const [draft, setDraft] = useState<StructureDraft | null>(null);
  const [billing, setBilling] = useState<FeeStructure | null>(null);
  const [classId, setClassId] = useState('');

  const open = (f?: FeeStructure) => {
    save.reset();
    setDraft(
      f
        ? {
            id: f.id, academicYearId: String(f.academicYearId), courseId: String(f.courseId), semester: String(f.semester), tuitionFee: String(f.tuitionFee),
            labFee: String(f.labFee), libraryFee: String(f.libraryFee), examFee: String(f.examFee), otherFee: String(f.otherFee), dueDate: f.dueDate,
          }
        : { id: null, academicYearId: '', courseId: '', semester: '1', tuitionFee: '', labFee: '0', libraryFee: '0', examFee: '0', otherFee: '0', dueDate: '' },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    save.mutate(
      {
        id: draft.id,
        input: {
          academicYearId: Number(draft.academicYearId), courseId: Number(draft.courseId), semester: Number(draft.semester),
          tuitionFee: Number(draft.tuitionFee), labFee: Number(draft.labFee), libraryFee: Number(draft.libraryFee),
          examFee: Number(draft.examFee), otherFee: Number(draft.otherFee), dueDate: draft.dueDate,
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  const money = (label: string, key: keyof StructureDraft) =>
    draft ? (
      <div className="space-y-1.5">
        <Label htmlFor={`fs-${key}`}>{label}</Label>
        <Input id={`fs-${key}`} type="number" min={0} step="0.01" value={draft[key] as string} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
      </div>
    ) : null;

  return (
    <Card className="p-4">
      {canManage ? (
        <div className="mb-3 flex justify-end">
          <Button type="button" className="gap-1" onClick={() => open()}>
            <Plus size={15} /> Add fee structure
          </Button>
        </div>
      ) : null}
      {structures.isLoading ? (
        <Skeleton className="h-24" />
      ) : structures.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorText(structures.error)}</AlertDescription>
        </Alert>
      ) : (structures.data ?? []).length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No fee structures yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Year · Sem</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Billed</TableHead>
              <TableHead>Collected</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(structures.data ?? []).map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.course ? `${f.course.code} · ${f.course.name}` : '—'}</TableCell>
                <TableCell>
                  {f.academicYear?.year} · Sem {f.semester}
                </TableCell>
                <TableCell>{formatMoney(f.totalFee)}</TableCell>
                <TableCell>{f.dueDate}</TableCell>
                <TableCell>{f.studentsBilled}</TableCell>
                <TableCell>{formatMoney(f.collected)}</TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="icon" aria-label={`Bill a class for ${f.course?.code} sem ${f.semester}`} onClick={() => { assign.reset(); setBilling(f); setClassId(''); }}>
                      <Users size={14} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${f.course?.code} sem ${f.semester}`} onClick={() => open(f)}>
                      <Pencil size={14} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${f.course?.code} sem ${f.semester}`} onClick={() => remove.mutate(f.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {errorText(remove.error) ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{errorText(remove.error)}</AlertDescription>
        </Alert>
      ) : null}

      <Dialog open={draft !== null} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="max-w-lg">
          {draft ? (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>{draft.id === null ? 'Add fee structure' : 'Edit fee structure'}</DialogTitle>
                <DialogDescription>Changing the amounts updates the dues of students already billed.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fs-year">Academic year *</Label>
                  <Select id="fs-year" required value={draft.academicYearId} onChange={(e) => setDraft({ ...draft, academicYearId: e.target.value })}>
                    <option value="">Choose…</option>
                    {(years.data ?? []).map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.year}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fs-course">Course *</Label>
                  <Select id="fs-course" required value={draft.courseId} onChange={(e) => setDraft({ ...draft, courseId: e.target.value })}>
                    <option value="">Choose…</option>
                    {(courses.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code ? `${c.code} · ${c.name}` : c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fs-semester">Semester *</Label>
                  <Input id="fs-semester" type="number" min={1} max={16} required value={draft.semester} onChange={(e) => setDraft({ ...draft, semester: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fs-due">Due date *</Label>
                  <Input id="fs-due" type="date" required value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
                </div>
                {money('Tuition fee *', 'tuitionFee')}
                {money('Lab fee', 'labFee')}
                {money('Library fee', 'libraryFee')}
                {money('Exam fee', 'examFee')}
                {money('Other fee', 'otherFee')}
              </div>
              {errorText(save.error) ? (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription>{errorText(save.error)}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={billing !== null} onOpenChange={(isOpen) => !isOpen && setBilling(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bill a class</DialogTitle>
            <DialogDescription>Every student in the class gets this fee as a due. Students already billed are skipped.</DialogDescription>
          </DialogHeader>
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="bill-class">Class</Label>
            <Select id="bill-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Choose…</option>
              {(classes.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.totalStudents})
                </option>
              ))}
            </Select>
          </div>
          {assign.data ? <p className="mt-2 text-sm">Billed {assign.data.assigned} students, {assign.data.skipped} already billed.</p> : null}
          {errorText(assign.error) ? (
            <Alert variant="destructive" className="mt-2">
              <AlertDescription>{errorText(assign.error)}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setBilling(null)}>
              Close
            </Button>
            <Button type="button" disabled={!classId || assign.isPending} onClick={() => billing && assign.mutate({ id: billing.id, target: { classId: Number(classId) } })}>
              Bill class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Dues({ canManage }: { canManage: boolean }) {
  const [status, setStatus] = useState<FeeStatus | ''>('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const dues = useStudentFees({ status: status || undefined, search: search.trim() || undefined });

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input aria-label="Search students" placeholder="Search by name or register number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as FeeStatus | '')} className="sm:w-44">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
          <option value="paid">Paid</option>
        </Select>
      </div>
      {dues.isLoading ? (
        <Skeleton className="h-24" />
      ) : dues.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorText(dues.error)}</AlertDescription>
        </Alert>
      ) : (dues.data?.data ?? []).length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">No dues match.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Payments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(dues.data?.data ?? []).map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  {f.student?.name}
                  <span className="block text-xs text-muted-foreground">{f.student?.registrationNumber}</span>
                </TableCell>
                <TableCell>
                  {f.feeStructure?.course?.code} · Sem {f.feeStructure?.semester}
                </TableCell>
                <TableCell>{f.dueDate}</TableCell>
                <TableCell>{formatMoney(f.amountPaid)}</TableCell>
                <TableCell>{formatMoney(f.balance)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[f.status]}>{f.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="ghost" size="sm" className="gap-1" aria-label={`Payments of ${f.student?.name}`} onClick={() => setOpenId(f.id)}>
                    <Receipt size={14} /> {canManage && f.balance > 0 ? 'Record' : 'View'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <PaymentsDialog feeId={openId} canManage={canManage} onClose={() => setOpenId(null)} />
    </Card>
  );
}

function PaymentsDialog({ feeId, canManage, onClose }: { feeId: number | null; canManage: boolean; onClose: () => void }) {
  const fee = useStudentFee(feeId);
  const record = useRecordPayment();
  const voidPayment = useVoidPayment();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (feeId === null) return;
    record.mutate(
      { feeId, input: { amount: Number(amount), method, reference: reference.trim() || null } },
      { onSuccess: () => { setAmount(''); setReference(''); } },
    );
  };

  const f = fee.data;

  return (
    <Dialog open={feeId !== null} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{f?.student?.name ?? 'Payments'}</DialogTitle>
          <DialogDescription>
            {f ? `${f.feeStructure?.course?.code} · Sem ${f.feeStructure?.semester} · Due ${formatMoney(f.amountDue)} · Balance ${formatMoney(f.balance)}` : 'Loading…'}
          </DialogDescription>
        </DialogHeader>
        {(f?.payments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border text-sm" aria-label="Payments">
            {(f?.payments ?? []).map((p) => (
              <li key={p.id} className={`flex items-center justify-between gap-2 px-3 py-2 ${p.voided ? 'text-muted-foreground line-through' : ''}`}>
                <span>
                  {p.receiptNumber} · {p.paidOn} · {formatMoney(p.amount)} · {p.method}
                  {p.reference ? ` · ${p.reference}` : ''}
                  {p.voided ? ` (void: ${p.voidReason})` : ''}
                </span>
                {canManage && !p.voided ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Void ${p.receiptNumber}`}
                    onClick={() => {
                      const reason = window.prompt('Why is this payment void?');
                      if (reason?.trim()) voidPayment.mutate({ paymentId: p.id, reason: reason.trim() });
                    }}
                  >
                    Void
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage && f && f.balance > 0 ? (
          <form onSubmit={submit} className="mt-3 grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount *</Label>
              <Input id="pay-amount" type="number" min={0.01} step="0.01" max={f.balance} required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input id="pay-ref" maxLength={100} value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="col-span-3 flex justify-end">
              <Button type="submit" disabled={record.isPending}>
                Record payment
              </Button>
            </div>
          </form>
        ) : null}

        {errorText(record.error ?? voidPayment.error) ? (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{errorText(record.error ?? voidPayment.error)}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter className="mt-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
