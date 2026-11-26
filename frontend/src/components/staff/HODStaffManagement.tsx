/**
 * The department's staff with what they teach (GET /department-portal/staff). HODs whose
 * designation grants staff.create / edit / delete can also manage the accounts of their own
 * department, handing out only designations whose access they hold themselves.
 */
import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ApiError } from '../../api/apiError';
import {
  useDepartmentStaff,
  useRemoveDepartmentStaff,
  useSaveDepartmentStaff,
  type DepartmentStaffMember,
} from '../../api/departmentPortalApi';
import {
  Alert,
  AlertDescription,
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

type Draft = { id: number | null; name: string; email: string; password: string; designationId: string; phone: string };

export function HODStaffManagement({ departmentCode }: { departmentCode?: string } = {}) {
  const staff = useDepartmentStaff(departmentCode);
  const save = useSaveDepartmentStaff();
  const remove = useRemoveDepartmentStaff();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<DepartmentStaffMember | null>(null);

  const meta = staff.data?.meta;
  const fieldErrors = save.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError = save.error instanceof ApiError && Object.keys(fieldErrors).length === 0 ? save.error.message : null;
  const error = (field: string) => (fieldErrors[field] ? <p className="text-xs text-destructive">{fieldErrors[field]}</p> : null);

  const open = (member?: DepartmentStaffMember) => {
    save.reset();
    setDraft(
      member
        ? { id: member.id, name: member.name, email: member.email, password: '', designationId: member.designationId ? String(member.designationId) : '', phone: member.phone ?? '' }
        : { id: null, name: '', email: '', password: '', designationId: '', phone: '' },
    );
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    save.mutate(
      {
        id: draft.id,
        input: {
          name: draft.name.trim(),
          email: draft.email.trim(),
          password: draft.password || null,
          designationId: Number(draft.designationId),
          phone: draft.phone.trim() || null,
        },
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  if (staff.isLoading) return <Skeleton className="h-48 w-full" />;
  if (staff.error || !staff.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{staff.error instanceof ApiError ? staff.error.message : 'Department staff could not be loaded.'}</AlertDescription>
      </Alert>
    );
  }

  const rows = staff.data.data;
  const canManageRows = Boolean(meta?.canEdit || meta?.canDelete);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Department staff</h1>
          <p className="text-sm text-muted-foreground">
            {meta?.department.name} · {rows.length} staff
          </p>
        </div>
        {meta?.canCreate ? (
          <Button type="button" onClick={() => open()} className="gap-1.5">
            <Plus size={16} /> Add staff
          </Button>
        ) : null}
      </div>

      <Card className="p-4">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No staff in this department yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Teaches</TableHead>
                {canManageRows ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <span className="font-medium">{member.name}</span>
                    <span className="block text-xs text-muted-foreground">{member.email}</span>
                  </TableCell>
                  <TableCell>{member.designationName ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {member.subjects.length === 0
                      ? <span className="text-muted-foreground">Not allocated</span>
                      : member.subjects.map((s) => `${s.code}${s.semester ? ` (${s.semester})` : ''}`).join(', ')}
                  </TableCell>
                  {canManageRows ? (
                    <TableCell className="text-right">
                      {meta?.canEdit && member.role === 'staff' ? (
                        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${member.name}`} onClick={() => open(member)}>
                          <Pencil size={14} />
                        </Button>
                      ) : null}
                      {meta?.canDelete && member.role === 'staff' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${member.name}`}
                          onClick={() => {
                            remove.reset();
                            setDeleting(member);
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      ) : null}
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
                <DialogTitle>{draft.id === null ? 'Add staff' : `Edit ${draft.name}`}</DialogTitle>
                <DialogDescription>Accounts are created in {meta?.department.name}. You can give only designations whose access you hold yourself.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ds-name">Name *</Label>
                  <Input id="ds-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  {error('name')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-email">Email *</Label>
                  <Input id="ds-email" type="email" required value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                  {error('email')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-designation">Designation *</Label>
                  <Select id="ds-designation" required value={draft.designationId} onChange={(e) => setDraft({ ...draft, designationId: e.target.value })}>
                    <option value="">Choose…</option>
                    {(meta?.designations ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                  {error('designationId')}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-phone">Phone</Label>
                  <Input id="ds-phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                  {error('phone')}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="ds-password">{draft.id === null ? 'Password *' : 'New password'}</Label>
                  <Input
                    id="ds-password"
                    type="password"
                    required={draft.id === null}
                    minLength={8}
                    placeholder={draft.id === null ? 'At least 8 characters' : 'Leave blank to keep the current password'}
                    value={draft.password}
                    onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  />
                  {error('password')}
                </div>
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
            <DialogTitle>Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>Their account is deactivated and they are signed out. Marks and records they entered stay.</DialogDescription>
          </DialogHeader>
          {remove.error ? (
            <Alert variant="destructive">
              <AlertDescription>{remove.error instanceof ApiError ? remove.error.message : 'The account could not be removed.'}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
