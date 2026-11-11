/** Operator account, two-step verification (TOTP MFA), and personal sessions (SRS FR-SEC-004). */
import { useState, type FormEvent } from 'react';
import { Copy, KeyRound, Laptop, ShieldCheck, ShieldOff } from 'lucide-react';
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { ownerApi, useMfaStatus, useOwnerMutation, useSessions } from '../../api/ownerApi';
import { campusRoleLabels } from '../../campusTypes';
import { EmptyState, ErrorState, errorMessage, Field, formatDateTime, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function AccountPage({ user }: OwnerPageProps) {
  const mfa = useMfaStatus();
  const sessions = useSessions();
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);

  const startSetup = useOwnerMutation(() => ownerApi.mfaSetup());
  const confirmMfa = useOwnerMutation((code: string) => ownerApi.mfaConfirm(code));
  const disableMfa = useOwnerMutation((code: string) => ownerApi.mfaDisable(code));
  const revokeSession = useOwnerMutation((id: number) => ownerApi.revokeSession(id));

  const beginSetup = async () => {
    setFeedback('');
    const result = await startSetup.mutateAsync(undefined);
    setSetupData(result);
    setConfirmCode('');
  };

  const handleConfirm = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback('');
    await confirmMfa.mutateAsync(confirmCode.trim());
    setSetupData(null);
    setConfirmCode('');
    setFeedback('Two-step verification is now active.');
  };

  const handleDisable = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback('');
    await disableMfa.mutateAsync(disableCode.trim());
    setDisableCode('');
    setFeedback('Two-step verification has been turned off.');
  };

  const copySecret = async () => {
    if (!setupData) return;
    await navigator.clipboard?.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const actionError = startSetup.error || confirmMfa.error || disableMfa.error || revokeSession.error;

  return (
    <div className="space-y-5">
      <PageHeader title="My account" description="Operator profile, two-step verification, and active sessions." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operator identity</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium text-foreground">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium text-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="font-medium text-foreground">
              {user.role === 'super_admin' ? 'Platform Owner' : user.platformRole ?? campusRoleLabels[user.role]}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound size={16} /> Two-step verification (TOTP)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Protects platform sign-ins at /owner/login using an authenticator app code.
            </p>
          </div>
          {mfa.data ? (
            <Badge variant={mfa.data.enabled ? 'success' : mfa.data.required ? 'destructive' : 'secondary'}>
              {mfa.data.enabled ? 'Enabled' : mfa.data.required ? 'Setup required' : 'Off'}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {mfa.isPending ? <LoadingRows rows={2} /> : null}
          {mfa.isError ? <ErrorState error={mfa.error} onRetry={() => void mfa.refetch()} /> : null}
          {feedback ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
              <AlertDescription className="text-xs font-medium">{feedback}</AlertDescription>
            </Alert>
          ) : null}
          {actionError ? (
            <Alert variant="destructive">
              <AlertDescription className="text-xs font-medium">{errorMessage(actionError)}</AlertDescription>
            </Alert>
          ) : null}

          {mfa.data && !mfa.data.enabled ? (
            setupData ? (
              <form onSubmit={handleConfirm} className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-foreground">1. Add this setup key to your authenticator app:</p>
                  <div className="flex items-center gap-2">
                    <code className="rounded-md bg-background px-3 py-1.5 font-mono text-sm tracking-wider border border-border">
                      {setupData.secret}
                    </code>
                    <Button type="button" size="sm" variant="outline" onClick={() => void copySecret()}>
                      <Copy size={13} /> {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="break-all text-muted-foreground">{setupData.otpauthUri}</p>
                </div>
                <Field label="2. Enter the 6-digit code to confirm" htmlFor="mfa-confirm-code">
                  <Input
                    id="mfa-confirm-code"
                    value={confirmCode}
                    onChange={(event) => setConfirmCode(event.target.value)}
                    placeholder="123456"
                    inputMode="numeric"
                    className="max-w-xs"
                    required
                  />
                </Field>
                <div className="flex gap-2">
                  <Button type="submit" disabled={confirmMfa.isPending}>
                    <ShieldCheck size={14} /> {confirmMfa.isPending ? 'Confirming...' : 'Enable Two-Step Verification'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setSetupData(null)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button onClick={() => void beginSetup()} disabled={startSetup.isPending}>
                <ShieldCheck size={14} /> {startSetup.isPending ? 'Generating key...' : 'Set up Two-Step Verification'}
              </Button>
            )
          ) : null}

          {mfa.data?.enabled ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Enabled on {formatDateTime(mfa.data.enabledAt)}</p>
              {!mfa.data.required ? (
                <form onSubmit={handleDisable} className="flex flex-wrap items-end gap-2">
                  <Field label="Current authenticator code to disable" htmlFor="mfa-disable-code">
                    <Input
                      id="mfa-disable-code"
                      value={disableCode}
                      onChange={(event) => setDisableCode(event.target.value)}
                      placeholder="123456"
                      inputMode="numeric"
                      className="w-44"
                      required
                    />
                  </Field>
                  <Button type="submit" variant="outline" disabled={disableMfa.isPending}>
                    <ShieldOff size={14} /> Disable MFA
                  </Button>
                </form>
              ) : (
                <p className="text-xs font-medium text-amber-700">
                  Global policy requires MFA for all platform operators, so it cannot be turned off.
                </p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Laptop size={16} /> Active platform sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.isPending ? <LoadingRows rows={3} /> : null}
          {sessions.isError ? <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} /> : null}
          {sessions.data && sessions.data.length === 0 ? (
            <EmptyState title="No active sessions" />
          ) : (
            <div className="divide-y divide-border text-sm">
              {(sessions.data ?? [])
                .filter((session) => !session.user || session.user.id === user.id)
                .map((session) => (
                  <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <p className="font-medium text-foreground">
                        {session.device}{' '}
                        {session.current ? <Badge variant="info">Current</Badge> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last active {formatDateTime(session.lastUsedAt)} · Created {formatDateTime(session.createdAt)}
                      </p>
                    </div>
                    {!session.current ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={revokeSession.isPending}
                        onClick={() => void revokeSession.mutateAsync(session.id)}
                      >
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

