/** Integrations catalog, API client credentials & outbound webhooks (SRS §5.21). */
import { useState, type FormEvent } from 'react';
import { Key, Link2, Play, Plus, Webhook } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
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
import { OWNER, useOwnerMutation } from '../../api/ownerApi';
import { ownerOperationsApi, useApiClients, useIntegrations, useWebhooks } from '../../api/ownerOperationsApi';
import { EmptyState, ErrorState, errorMessage, Field, formatDateTime, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function IntegrationsPage({ can }: OwnerPageProps) {
  const [tab, setTab] = useState('catalog');
  const [addingIntegration, setAddingIntegration] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [revealedKey, setRevealedKey] = useState('');

  const canManage = can(OWNER.integrationsManage);
  const integrations = useIntegrations();
  const apiClients = useApiClients();
  const webhooks = useWebhooks();

  const testIntMut = useOwnerMutation((id: number) => ownerOperationsApi.testIntegration(id));
  const revokeClientMut = useOwnerMutation((id: number) => ownerOperationsApi.revokeApiClient(id));
  const testWebhookMut = useOwnerMutation((id: number) => ownerOperationsApi.testWebhook(id));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations, API keys & webhooks"
        description="Configure third-party connectors with masked credentials, mint hashed API client keys once, and verify webhook endpoints."
        actions={
          canManage ? (
            <>
              {tab === 'catalog' ? (
                <Button size="sm" onClick={() => setAddingIntegration(true)}>
                  <Plus size={14} /> Add connector
                </Button>
              ) : null}
              {tab === 'clients' ? (
                <Button size="sm" onClick={() => setCreatingClient(true)}>
                  <Plus size={14} /> Generate API key
                </Button>
              ) : null}
              {tab === 'webhooks' ? (
                <Button size="sm" onClick={() => setCreatingWebhook(true)}>
                  <Plus size={14} /> New webhook
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {revealedKey ? (
        <Alert variant="warning">
          <AlertDescription className="space-y-1">
            <span className="block font-semibold">Copy your new API key now — it will never be displayed again:</span>
            <code className="block rounded bg-muted px-2 py-1 font-mono text-xs">{revealedKey}</code>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="catalog">Integrations catalog</TabsTrigger>
          <TabsTrigger value="clients">API clients</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 pt-4">
          {integrations.isPending ? <LoadingRows rows={3} /> : null}
          {integrations.isError ? <ErrorState error={integrations.error} /> : null}
          {integrations.data && integrations.data.length === 0 ? <EmptyState title="No integrations configured" /> : null}
          {integrations.data && integrations.data.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {integrations.data.map((item) => (
                <Card key={item.id}>
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link2 size={15} className="text-primary" />
                        <span className="font-semibold">{item.name}</span>
                        <Badge variant={item.status === 'active' ? 'success' : item.status === 'error' ? 'destructive' : 'secondary'}>{item.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.category} · Provider: {item.provider} · Secret: {item.secretConfigured ? 'Configured (masked)' : 'Not set'}
                      </p>
                      {item.lastTestMessage ? (
                        <p className="text-2xs text-muted-foreground">
                          Last test ({item.lastTestStatus}): {item.lastTestMessage} · {formatDateTime(item.lastTestedAt)}
                        </p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <Button size="sm" variant="outline" disabled={testIntMut.isPending} onClick={() => void testIntMut.mutateAsync(item.id)}>
                        <Play size={12} /> Test
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4 pt-4">
          {apiClients.isPending ? <LoadingRows rows={3} /> : null}
          {apiClients.isError ? <ErrorState error={apiClients.error} /> : null}
          {apiClients.data && apiClients.data.length === 0 ? <EmptyState title="No API clients created" /> : null}
          {apiClients.data && apiClients.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Rate limit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiClients.data.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5 font-medium"><Key size={13} /> {client.name}</span>
                          <span className="text-2xs text-muted-foreground">{client.institution?.name ?? 'Platform wide'}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{client.keyPrefix}...</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{client.scopes.join(', ') || 'read'}</TableCell>
                        <TableCell className="text-xs">{client.rateLimitPerMin} rpm</TableCell>
                        <TableCell><Badge variant={client.status === 'active' ? 'success' : 'destructive'}>{client.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {canManage && client.status === 'active' ? (
                            <Button size="sm" variant="destructive" onClick={() => void revokeClientMut.mutateAsync(client.id)}>Revoke</Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 pt-4">
          {webhooks.isPending ? <LoadingRows rows={3} /> : null}
          {webhooks.isError ? <ErrorState error={webhooks.error} /> : null}
          {webhooks.data && webhooks.data.length === 0 ? <EmptyState title="No outbound webhooks configured" /> : null}
          {webhooks.data && webhooks.data.length > 0 ? (
            <div className="space-y-3">
              {webhooks.data.map((wh) => (
                <Card key={wh.id}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Webhook size={15} className="text-primary" />
                        <span className="font-semibold">{wh.name}</span>
                        <Badge variant={wh.isActive ? 'success' : 'secondary'}>{wh.isActive ? 'Active' : 'Paused'}</Badge>
                        {wh.lastStatusCode ? <Badge variant="secondary">HTTP {wh.lastStatusCode}</Badge> : null}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{wh.url}</p>
                      <p className="text-2xs text-muted-foreground">
                        Events: {wh.events.join(', ')} · Secret: {wh.secretMasked ?? 'hidden'} · Last delivery: {formatDateTime(wh.lastDeliveryAt)}
                      </p>
                    </div>
                    {canManage ? (
                      <Button size="sm" variant="outline" disabled={testWebhookMut.isPending} onClick={() => void testWebhookMut.mutateAsync(wh.id)}>
                        <Play size={12} /> Send test
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {addingIntegration ? <SaveIntegrationDialog onClose={() => setAddingIntegration(false)} /> : null}
      {creatingClient ? <CreateApiClientDialog onCreated={(plainKey) => setRevealedKey(plainKey)} onClose={() => setCreatingClient(false)} /> : null}
      {creatingWebhook ? <CreateWebhookDialog onClose={() => setCreatingWebhook(false)} /> : null}
    </div>
  );
}

function SaveIntegrationDialog({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('email');
  const [provider, setProvider] = useState('ses');
  const [secret, setSecret] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.saveIntegration);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({ key, name, category, provider, status: 'active', secret: secret || undefined });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Save integration connector</DialogTitle>
            <DialogDescription>Secrets are encrypted at rest and never exposed in API responses.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Key"><Input required value={key} onChange={(e) => setKey(e.target.value)} placeholder="aws_ses" /></Field>
            <Field label="Display name"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Amazon SES" /></Field>
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="email">Email</option>
                <option value="payment">Payment</option>
                <option value="storage">Storage</option>
                <option value="sso">SSO / OAuth</option>
                <option value="ai">AI Provider</option>
              </Select>
            </Field>
            <Field label="Provider"><Input required value={provider} onChange={(e) => setProvider(e.target.value)} /></Field>
          </div>
          <Field label="API Secret / Token"><Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save connector</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateApiClientDialog({ onCreated, onClose }: { onCreated: (key: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [scopesRaw, setScopesRaw] = useState('read,institutions:read');
  const [rateLimitPerMin, setRateLimitPerMin] = useState(120);
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createApiClient);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const scopes = scopesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const res = await mut.mutateAsync({ name, scopes, rateLimitPerMin });
      onCreated(res.plainKey);
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Generate API client key</DialogTitle>
            <DialogDescription>Keys are SHA-256 hashed before storage; plaintext is returned only once.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Client name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Scopes (comma-separated)"><Input required value={scopesRaw} onChange={(e) => setScopesRaw(e.target.value)} /></Field>
          <Field label="Rate limit (req/min)"><Input type="number" min={10} value={rateLimitPerMin} onChange={(e) => setRateLimitPerMin(Number(e.target.value))} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Generate key</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateWebhookDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [eventsRaw, setEventsRaw] = useState('subscription.renewed,invoice.paid');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createWebhook);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const events = eventsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await mut.mutateAsync({ name, url, events });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>Create outbound webhook</DialogTitle>
            <DialogDescription>Signed event notifications for tenant and billing events.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Webhook name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Endpoint URL"><Input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhooks/alphagrew" /></Field>
          <Field label="Events (comma-separated)"><Input required value={eventsRaw} onChange={(e) => setEventsRaw(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save webhook</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

