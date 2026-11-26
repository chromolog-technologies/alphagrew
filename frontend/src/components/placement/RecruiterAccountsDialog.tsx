/** Placement office: invite and remove recruiter accounts for a company. */
import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/apiError';
import { recruiterApi, useRecruiterAccounts, useRecruiterMutation } from '../../api/recruiterApi';
import { Alert, AlertDescription, Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Select } from '../ui';

interface Props {
  open: boolean;
  onClose: () => void;
  companies: { id: number; name: string }[];
}

export function RecruiterAccountsDialog({ open, onClose, companies }: Props) {
  const [companyId, setCompanyId] = useState<number | null>(null);
  const accounts = useRecruiterAccounts(open ? companyId : null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const invite = useRecruiterMutation((input: { name: string; email: string }) => recruiterApi.invite(companyId as number, input));
  const remove = useRecruiterMutation((id: number) => recruiterApi.remove(companyId as number, id));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate(
      { name: name.trim(), email: email.trim() },
      {
        onSuccess: () => {
          setName('');
          setEmail('');
        },
      },
    );
  };
  const error = invite.error ?? remove.error;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recruiter accounts</DialogTitle>
          <DialogDescription>Recruiters see their company&apos;s jobs and the candidates you shortlist, and can leave feedback.</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-1.5">
          <Label htmlFor="rec-company">Company</Label>
          <Select id="rec-company" value={companyId ?? ''} onChange={(e) => setCompanyId(Number(e.target.value) || null)}>
            <option value="">Choose…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {companyId ? (
          <>
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm" aria-label="Recruiters">
              {(accounts.data ?? []).length === 0 ? <li className="p-3 text-muted-foreground">{accounts.isLoading ? 'Loading…' : 'No recruiters yet.'}</li> : null}
              {(accounts.data ?? []).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span>
                    {r.name}{' '}
                    <span className="text-xs text-muted-foreground">
                      {r.email} · {r.status}
                    </span>
                  </span>
                  {r.status === 'active' ? (
                    <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${r.name}`} disabled={remove.isPending} onClick={() => remove.mutate(r.id)}>
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
            <form onSubmit={submit} className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input aria-label="Recruiter name" required placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input aria-label="Recruiter email" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Button type="submit" disabled={invite.isPending}>
                Invite
              </Button>
            </form>
            {invite.data && !invite.data.emailSent ? (
              <p className="mt-2 text-xs text-destructive">The account was created but the email could not be sent. They can use “Forgot password” on the sign-in page.</p>
            ) : invite.data ? (
              <p className="mt-2 text-xs text-muted-foreground">Invitation sent. They set a password from the email.</p>
            ) : null}
          </>
        ) : null}
        {error ? (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>{error instanceof ApiError ? Object.values(error.firstFieldErrors)[0] ?? error.message : 'The change could not be saved.'}</AlertDescription>
          </Alert>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
