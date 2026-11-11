/** Users (SRS FR-US): every account on the platform, plus inviting and managing platform staff. */
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Search, UserPlus } from 'lucide-react';
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
} from '@/components/ui';
import { ApiError } from '../../api/http';
import { ownerApi, OWNER, useInstitutions, useOwnerMutation, usePlatformUser, usePlatformUsers, type PlatformUserDetail } from '../../api/ownerApi';
import { campusRoleLabels, type CampusRole } from '../../campusTypes';
import { EmptyState, ErrorState, errorMessage, Field, formatDate, formatDateTime, LoadingRows, PageHeader, Pagination, UserStatusBadge } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function UsersPage(props: OwnerPageProps) {
  return props.id ? <UserDetailView {...props} id={props.id} /> : <UserList {...props} />;
}

function UserList({ user, can, go }: OwnerPageProps) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [registeredFrom, setRegisteredFrom] = useState('');
  const [registeredTo, setRegisteredTo] = useState('');
  const [platformOnly, setPlatformOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const institutions = useInstitutions({ perPage: 100 });
  const list = usePlatformUsers({
    search,
    role,
    status,
    institutionId: institutionId || undefined,
    registeredFrom: registeredFrom || undefined,
    registeredTo: registeredTo || undefined,
    platformOnly: platformOnly ? 1 : undefined,
    page,
    perPage: 25,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Every account on the platform. Passwords and verification secrets are never shown."
        actions={
          can(OWNER.usersInvite) ? (
            <Button size="sm" onClick={() => setInviting(true)}>
              <UserPlus size={14} /> Invite platform owner
            </Button>
          ) : null
        }
      />
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_140px_180px_auto]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search users"
                placeholder="Search name or email"
                className="pl-8"
                value={search}
                onChange={(event) => (setSearch(event.target.value), setPage(1))}
              />
            </div>
            <Select aria-label="Role" value={role} onChange={(event) => (setRole(event.target.value), setPage(1))}>
              <option value="">All roles</option>
              {(Object.keys(campusRoleLabels) as CampusRole[])
                .filter((value) => value !== 'platform_staff')
                .map((value) => (
                  <option key={value} value={value}>
                    {value === 'super_admin' ? 'Platform Owner' : campusRoleLabels[value]}
                  </option>
                ))}
            </Select>
            <Select aria-label="Status" value={status} onChange={(event) => (setStatus(event.target.value), setPage(1))}>
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Select aria-label="Institution filter" value={institutionId} onChange={(event) => (setInstitutionId(event.target.value), setPage(1))}>
              <option value="">All institutions</option>
              {institutions.data?.data.map((inst) => (
                <option key={inst.id} value={String(inst.id)}>
                  {inst.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={platformOnly} onChange={(event) => (setPlatformOnly(event.target.checked), setPage(1))} /> Platform owners only
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Registered between:</span>
            <Input aria-label="Registered from" type="date" className="h-8 w-36" value={registeredFrom} onChange={(e) => (setRegisteredFrom(e.target.value), setPage(1))} />
            <span>and</span>
            <Input aria-label="Registered to" type="date" className="h-8 w-36" value={registeredTo} onChange={(e) => (setRegisteredTo(e.target.value), setPage(1))} />
          </div>

          {list.isPending ? <LoadingRows /> : null}
          {list.isError ? <ErrorState error={list.error} onRetry={() => void list.refetch()} /> : null}
          {list.data?.data.length === 0 ? <EmptyState title="No users match" /> : null}
          {list.data && list.data.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Last sign-in</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.data.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer" onClick={() => go(`users/${row.id}`)}>
                      <TableCell>
                        <span className="block font-medium text-foreground">
                          {row.name}
                          {row.id === user.id ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                        </span>
                        <span className="block text-xs text-muted-foreground">{row.email}</span>
                      </TableCell>
                      <TableCell>
                        {row.roleLabel}
                        {row.platformRole ? <span className="block text-xs text-muted-foreground">{row.platformRole.name}</span> : null}
                      </TableCell>
                      <TableCell>{row.institution ?? (row.isPlatform ? 'Platform' : '—')}</TableCell>
                      <TableCell>
                        <UserStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.emailVerified ? 'success' : 'secondary'}>{row.emailVerified ? 'Verified' : 'Unverified'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.lastLoginAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
          <Pagination meta={list.data?.meta} onPage={setPage} />
        </CardContent>
      </Card>
      {inviting ? <InviteDialog canInviteOwner={user.role === 'super_admin'} onClose={() => setInviting(false)} onInvited={(id) => go(`users/${id}`)} /> : null}
    </div>
  );
}

function InviteDialog({ canInviteOwner, onClose, onInvited }: { canInviteOwner: boolean; onClose: () => void; onInvited: (id: number) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const invite = useOwnerMutation(ownerApi.inviteUser);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    setMessage('');
    try {
      const created = await invite.mutateAsync({ name, email, role: 'super_admin', platformRoleId: null });
      onInvited(created.id);
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.firstFieldErrors);
      setMessage(errorMessage(error));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose}>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Invite platform owner</DialogTitle>
            <DialogDescription>They will receive an email link to set their password with full Owner Console access.</DialogDescription>
          </DialogHeader>
          {message ? (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          {!canInviteOwner ? (
            <Alert variant="destructive">
              <AlertDescription>Only an active Platform Owner can invite another Platform Owner.</AlertDescription>
            </Alert>
          ) : null}
          <Field label="Name" htmlFor="invite-name" error={errors.name}>
            <Input id="invite-name" required value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email" htmlFor="invite-email" error={errors.email}>
            <Input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canInviteOwner || invite.isPending}>
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserDetailView({ id, user, can, go }: OwnerPageProps & { id: number }) {
  const detail = usePlatformUser(id);
  const [suspending, setSuspending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const run = async (action: () => Promise<{ message?: string } | PlatformUserDetail>, success: string) => {
    setNotice('');
    setError('');
    try {
      await action();
      setNotice(success);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };
  const activate = useOwnerMutation(() => ownerApi.changeUserStatus(id, { status: 'active' }));
  const reset = useOwnerMutation(() => ownerApi.sendPasswordReset(id));
  const resendInvite = useOwnerMutation(() => ownerApi.resendUserInvite(id));
  const revoke = useOwnerMutation(() => ownerApi.revokeUserSessions(id));

  if (detail.isPending) return <LoadingRows rows={6} />;
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;

  const person = detail.data;
  const self = person.id === user.id;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => go('users')}>
        <ArrowLeft size={14} /> All users
      </Button>
      <PageHeader
        title={person.name}
        description={`${person.email} · ${person.role === 'super_admin' ? 'Platform Owner' : person.roleLabel}${person.institution ? ` at ${person.institution}` : ''}`}
        actions={
          <>
            {can(OWNER.usersInvite) && person.status !== 'suspended' ? (
              <Button variant="outline" size="sm" onClick={() => void run(() => resendInvite.mutateAsync(undefined), 'Invitation / verification link sent.')}>
                Resend invite / verification
              </Button>
            ) : null}
            {can(OWNER.usersSessions) ? (
              <>
                <Button variant="outline" size="sm" onClick={() => void run(() => reset.mutateAsync(undefined), 'Password reset link sent.')}>
                  Send password reset
                </Button>
                <Button variant="outline" size="sm" disabled={person.activeSessions === 0} onClick={() => void run(() => revoke.mutateAsync(undefined), 'Signed out everywhere.')}>
                  Sign out everywhere
                </Button>
              </>
            ) : null}
            {can(OWNER.usersSuspend) && !self ? (
              person.status === 'suspended' ? (
                <Button size="sm" variant="success" onClick={() => void run(() => activate.mutateAsync(undefined), 'Account reactivated.')}>
                  Reactivate
                </Button>
              ) : (
                <Button size="sm" variant="destructive" onClick={() => setSuspending(true)}>
                  Suspend
                </Button>
              )
            ) : null}
          </>
        }
      />
      {notice ? (
        <Alert variant="success">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Status">
                <UserStatusBadge status={person.status} />
                {person.statusReason ? <span className="mt-1 block text-xs text-muted-foreground">{person.statusReason}</span> : null}
              </Item>
              <Item label="Email verified">{person.emailVerified ? 'Yes' : 'No'}</Item>
              <Item label="Two-step verification">{person.isPlatform ? (person.mfaEnabled ? 'On' : 'Off') : 'Not available'}</Item>
              <Item label="Active sessions">{person.activeSessions}</Item>
              <Item label="Last sign-in">{formatDateTime(person.lastLoginAt)}</Item>
              <Item label="Locked until">{formatDateTime(person.lockedUntil)}</Item>
              <Item label="Joined">{formatDate(person.createdAt)}</Item>
              <Item label="Title">{person.title ?? '—'}</Item>
              <Item label="Phone">{person.phone ?? '—'}</Item>
            </dl>
          </CardContent>
        </Card>
        {person.isPlatform ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Platform access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Platform Owners hold unified full access across the Owner Console.</p>
            </CardContent>
          </Card>
        ) : null}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent sign-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {person.recentLogins.length === 0 ? <EmptyState title="No sign-ins recorded" /> : null}
            <ul className="divide-y divide-border">
              {person.recentLogins.map((login, index) => (
                <li key={index} className="flex justify-between gap-3 py-2 text-sm">
                  <span>
                    <Badge variant={login.outcome === 'success' ? 'success' : 'destructive'}>{login.outcome.replace('_', ' ')}</Badge>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {login.ip ?? ''} {login.reason ? `· ${login.reason}` : ''}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(login.at)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {suspending ? <SuspendUserDialog person={person} onClose={() => setSuspending(false)} onDone={() => setNotice('Account suspended and signed out.')} /> : null}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

export function SuspendUserDialog({ person, onClose, onDone }: { person: PlatformUserDetail; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const suspend = useOwnerMutation((text: string) => ownerApi.changeUserStatus(person.id, { status: 'suspended', reason: text }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Give a reason for suspending this account.');
      return;
    }
    try {
      await suspend.mutateAsync(reason.trim());
      onDone();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose}>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Suspend {person.name}?</DialogTitle>
            <DialogDescription>They are signed out everywhere and cannot sign in until reactivated.</DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Field label="Reason (required)" htmlFor="suspend-reason">
            <Input id="suspend-reason" value={reason} maxLength={255} onChange={(event) => setReason(event.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={suspend.isPending}>
              Suspend
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
