/**
 * Which students are in a class. Students see their class's timetable, so this is what makes a
 * timetable reach them.
 */
import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/apiError';
import { useAllStudents, useClassStudents, useSaveClassStudents } from '../../api/academicsApi';
import { Alert, AlertDescription, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Skeleton } from '../ui';

interface ClassRosterDialogProps {
  schoolClass: { id: number; name: string } | null;
  onClose: () => void;
}

export function ClassRosterDialog({ schoolClass, onClose }: ClassRosterDialogProps) {
  const open = schoolClass !== null;
  const members = useClassStudents(schoolClass?.id ?? null);
  const students = useAllStudents(open);
  const save = useSaveClassStudents();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (members.data) setSelected(new Set(members.data.map((m) => m.id)));
  }, [members.data]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (students.data ?? []).filter(
      (s) => !term || s.name.toLowerCase().includes(term) || (s.registrationNumber ?? '').toLowerCase().includes(term) || (s.departmentCode ?? '').toLowerCase().includes(term),
    );
  }, [students.data, search]);

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Students in {schoolClass?.name}</DialogTitle>
          <DialogDescription>{selected.size} selected. Students see this class&apos;s timetable.</DialogDescription>
        </DialogHeader>

        <Input className="mt-2" aria-label="Search students" placeholder="Search by name, register no. or department…" value={search} onChange={(e) => setSearch(e.target.value)} />

        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border">
          {students.isLoading || members.isLoading ? (
            <Skeleton className="m-2 h-24" />
          ) : visible.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No students found.</p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                    <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={s.name} />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.registrationNumber} · {s.departmentCode}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {save.error ? (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{save.error instanceof ApiError ? save.error.message : 'The class could not be saved.'}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={save.isPending || !schoolClass}
            onClick={() => schoolClass && save.mutate({ classId: schoolClass.id, studentIds: [...selected] }, { onSuccess: onClose })}
          >
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
