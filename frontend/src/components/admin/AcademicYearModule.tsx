/**
 * Academic years of the institution. One is active at a time; a year with semesters cannot be
 * deleted. Semesters are added to a year from the Semesters screen.
 */
import { useState, type FormEvent } from 'react';
import { Calendar, Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import { useAcademicYears, useDeleteAcademicYear, useSaveAcademicYear, type AcademicYear } from '../../api/academicsApi';
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
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui';

type Draft = { id: number | null; year: string; code: string; startDate: string; endDate: string; isActive: boolean };

export function AcademicYearModule({ canManage = true }: { canManage?: boolean }) {
  const years = useAcademicYears();
  const save = useSaveAcademicYear();
  const remove = useDeleteAcademicYear();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<AcademicYear | null>(null);

  const fieldErrors = save.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError = save.error instanceof ApiError && Object.keys(fieldErrors).length === 0 ? save.error.message : null;
  const error = (field: string) => (fieldErrors[field] ? <p className="text-xs text-destructive">{fieldErrors[field]}</p> : null);

  const open = (year?: AcademicYear) => {
    save.reset();
    setDraft(
      year
        ? { id: year.id, year: year.year, code: year.code, startDate: year.startDate, endDate: year.endDate, isActive: year.isActive }
        : { id: null, year: '', code: '', startDate: '', endDate: '', isActive: (years.data ?? []).length === 0 },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const { id, ...input } = draft;
    save.mutate({ id, input: { ...input, year: input.year.trim(), code: input.code.trim() } }, { onSuccess: () => setDraft(null) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Academic years</h1>
          <p className="text-sm text-muted-foreground">One year is active at a time. Semesters, exams and results belong to a year.</p>
        </div>
        {canManage ? (
          <Button type="button" onClick={() => open()} className="gap-1.5">
            <Plus size={16} /> Add academic year
          </Button>
        ) : null}
      </div>

      <Card className="p-4">
        {years.isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : years.error ? (
          <Alert variant="destructive">
            <AlertDescription>{years.error instanceof ApiError ? years.error.message : 'Academic years could not be loaded.'}</AlertDescription>
          </Alert>
        ) : (years.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No academic years yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Semesters</TableHead>
                <TableHead>Status</TableHead>
                {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(years.data ?? []).map((year) => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium">{year.year}</TableCell>
                  <TableCell className="font-mono text-xs">{year.code}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} aria-hidden="true" /> {year.startDate} → {year.endDate}
                    </span>
                  </TableCell>
                  <TableCell>{year.semestersCount}</TableCell>
                  <TableCell>{year.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${year.year}`} onClick={() => open(year)}>
                        <Pencil size={14} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${year.year}`}
                        onClick={() => {
                          remove.reset();
                          setDeleting(year);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={draft !== null} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent className="max-w-lg">
          {draft ? (
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>{draft.id === null ? 'Add academic year' : `Edit ${draft.year}`}</DialogTitle>
                <DialogDescription>Making a year active switches the others off.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ay-year">Name *</Label>
                  <Input id="ay-year" required maxLength={20} placeholder="2026-2027" value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} />
                  {error('year')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ay-code">Code *</Label>
                  <Input id="ay-code" required maxLength={20} placeholder="AY2627" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
                  {error('code')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ay-start">Starts *</Label>
                  <Input id="ay-start" type="date" required value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
                  {error('startDate')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ay-end">Ends *</Label>
                  <Input id="ay-end" type="date" required value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
                  {error('endDate')}
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                  Active year
                </label>
              </div>
              {formError ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(isOpen) => !isOpen && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.year}?</DialogTitle>
            <DialogDescription>
              {(deleting?.semestersCount ?? 0) > 0 ? 'This year has semesters, so it cannot be deleted. Remove its semesters first.' : 'The year is removed.'}
            </DialogDescription>
          </DialogHeader>
          {remove.error ? (
            <Alert variant="destructive">
              <AlertDescription>{remove.error instanceof ApiError ? remove.error.message : 'The year could not be deleted.'}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending || (deleting?.semestersCount ?? 0) > 0}
              onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
