/** Platform announcements, CMS pages/FAQs with revision history & product release lifecycle (SRS §5.18, §5.24, §5.25). */
import { useState, type FormEvent } from 'react';
import { FileCode2, Megaphone, Plus, Rocket } from 'lucide-react';
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
import {
  ownerOperationsApi,
  useAnnouncements,
  useCmsPages,
  useProductReleases,
  type CmsPageItem,
  type PlatformAnnouncement,
  type ProductReleaseItem,
} from '../../api/ownerOperationsApi';
import { EmptyState, ErrorState, errorMessage, Field, formatDateTime, LoadingRows, PageHeader } from './ownerUi';
import type { OwnerPageProps } from './OwnerWorkspace';

export function CommunicationsPage({ can }: OwnerPageProps) {
  const [tab, setTab] = useState('announcements');
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [editingCms, setEditingCms] = useState<CmsPageItem | 'new' | null>(null);
  const [creatingRelease, setCreatingRelease] = useState(false);

  const canManage = can(OWNER.communicationsManage);
  const announcements = useAnnouncements();
  const cmsPages = useCmsPages();
  const releases = useProductReleases();

  const updateAnnMut = useOwnerMutation(({ id, status }: { id: number; status: PlatformAnnouncement['status'] }) =>
    ownerOperationsApi.updateAnnouncement(id, { status }),
  );
  const updateRelMut = useOwnerMutation(
    ({ id, ...input }: { id: number; deploymentStatus?: ProductReleaseItem['deploymentStatus']; publicationStatus?: ProductReleaseItem['publicationStatus'] }) =>
      ownerOperationsApi.updateRelease(id, input),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Communications, CMS & releases"
        description="Broadcast platform announcements, edit CMS policies/FAQs with version history, and track deployment vs release-note publication."
        actions={
          canManage ? (
            <>
              {tab === 'announcements' ? (
                <Button size="sm" onClick={() => setCreatingAnnouncement(true)}>
                  <Plus size={14} /> New announcement
                </Button>
              ) : null}
              {tab === 'cms' ? (
                <Button size="sm" onClick={() => setEditingCms('new')}>
                  <Plus size={14} /> New CMS page
                </Button>
              ) : null}
              {tab === 'releases' ? (
                <Button size="sm" onClick={() => setCreatingRelease(true)}>
                  <Plus size={14} /> New release
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="cms">CMS &amp; FAQs</TabsTrigger>
          <TabsTrigger value="releases">Product releases</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4 pt-4">
          {announcements.isPending ? <LoadingRows rows={4} /> : null}
          {announcements.isError ? <ErrorState error={announcements.error} /> : null}
          {announcements.data && announcements.data.length === 0 ? <EmptyState title="No platform announcements yet" /> : null}
          {announcements.data && announcements.data.length > 0 ? (
            <div className="space-y-3">
              {announcements.data.map((ann) => (
                <Card key={ann.id}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Megaphone size={15} className="text-primary" />
                        <span className="font-semibold text-foreground">{ann.title}</span>
                        <Badge variant={ann.status === 'published' ? 'success' : ann.status === 'archived' ? 'secondary' : 'info'}>{ann.status}</Badge>
                        <Badge variant="secondary" className="capitalize">{ann.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{ann.body}</p>
                      <p className="text-2xs text-muted-foreground">
                        Channels: {ann.channels.join(', ')} · Target: {ann.targetScope} · Delivered {ann.deliveredCount} · {formatDateTime(ann.publishedAt ?? ann.createdAt)}
                      </p>
                    </div>
                    {canManage && ann.status !== 'archived' ? (
                      <div className="flex gap-1.5">
                        {ann.status !== 'published' ? (
                          <Button size="sm" onClick={() => void updateAnnMut.mutateAsync({ id: ann.id, status: 'published' })}>Publish</Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => void updateAnnMut.mutateAsync({ id: ann.id, status: 'archived' })}>Archive</Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="cms" className="space-y-4 pt-4">
          {cmsPages.isPending ? <LoadingRows rows={4} /> : null}
          {cmsPages.isError ? <ErrorState error={cmsPages.error} /> : null}
          {cmsPages.data && cmsPages.data.length === 0 ? <EmptyState title="No CMS pages yet" /> : null}
          {cmsPages.data && cmsPages.data.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title &amp; slug</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Revision</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated by</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cmsPages.data.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <span className="flex items-center gap-1.5 font-medium"><FileCode2 size={14} /> {page.title}</span>
                          <span className="font-mono text-2xs text-muted-foreground">/{page.slug}</span>
                        </TableCell>
                        <TableCell className="capitalize text-xs">{page.contentType.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="text-xs">v{page.currentVersion}</TableCell>
                        <TableCell>
                          <Badge variant={page.status === 'published' ? 'success' : 'secondary'} className="capitalize">{page.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{page.updatedBy ?? 'Owner'}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setEditingCms(page)}>Edit / History</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="releases" className="space-y-4 pt-4">
          {releases.isPending ? <LoadingRows rows={4} /> : null}
          {releases.isError ? <ErrorState error={releases.error} /> : null}
          {releases.data && releases.data.length === 0 ? <EmptyState title="No product releases logged" /> : null}
          {releases.data && releases.data.length > 0 ? (
            <div className="space-y-3">
              {releases.data.map((rel) => (
                <Card key={rel.id}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Rocket size={15} className="text-primary" />
                        <span className="font-mono text-xs font-semibold">{rel.version}</span>
                        <span className="font-semibold text-foreground">{rel.title}</span>
                        <Badge variant="secondary" className="uppercase">{rel.releaseType}</Badge>
                        <Badge variant={rel.deploymentStatus === 'deployed' ? 'success' : 'info'}>Deploy: {rel.deploymentStatus}</Badge>
                        <Badge variant={rel.publicationStatus === 'published' ? 'success' : 'secondary'}>Notes: {rel.publicationStatus}</Badge>
                      </div>
                      {rel.notes ? <p className="text-xs text-muted-foreground">{rel.notes}</p> : null}
                      {rel.features.length > 0 ? (
                        <p className="text-2xs text-muted-foreground">Features: {rel.features.join(' · ')}</p>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex flex-wrap gap-1.5">
                        {rel.deploymentStatus !== 'deployed' ? (
                          <Button size="sm" variant="outline" onClick={() => void updateRelMut.mutateAsync({ id: rel.id, deploymentStatus: 'deployed' })}>
                            Mark deployed
                          </Button>
                        ) : null}
                        {rel.publicationStatus !== 'published' ? (
                          <Button size="sm" onClick={() => void updateRelMut.mutateAsync({ id: rel.id, publicationStatus: 'published' })}>
                            Publish notes
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      {creatingAnnouncement ? <CreateAnnouncementDialog onClose={() => setCreatingAnnouncement(false)} /> : null}
      {editingCms ? <CmsEditorDialog page={editingCms === 'new' ? null : editingCms} canManage={canManage} onClose={() => setEditingCms(null)} /> : null}
      {creatingRelease ? <CreateReleaseDialog onClose={() => setCreatingRelease(false)} /> : null}
    </div>
  );
}

function CreateAnnouncementDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('product_update');
  const [priority, setPriority] = useState('normal');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createAnnouncement);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await mut.mutateAsync({ title, body, category, priority, channels: ['in_app', 'email'], targetScope: 'all', status });
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New platform announcement</DialogTitle>
            <DialogDescription>Publish notice across institution portals or save as draft.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <Field label="Title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="product_update">Product update</option>
                <option value="maintenance">Maintenance</option>
                <option value="security">Security</option>
                <option value="billing">Billing</option>
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </Field>
            <Field label="Publish state">
              <Select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}>
                <option value="published">Publish immediately</option>
                <option value="draft">Save draft</option>
              </Select>
            </Field>
          </div>
          <Field label="Message">
            <textarea required rows={3} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Save announcement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CmsEditorDialog({ page, canManage, onClose }: { page: CmsPageItem | null; canManage: boolean; onClose: () => void }) {
  const isNew = !page;
  const [contentType, setContentType] = useState<CmsPageItem['contentType']>(page?.contentType ?? 'faq');
  const [slug, setSlug] = useState(page?.slug ?? '');
  const [title, setTitle] = useState(page?.title ?? '');
  const [body, setBody] = useState(page?.body ?? '');
  const [status, setStatus] = useState<CmsPageItem['status']>(page?.status ?? 'published');
  const [changeNote, setChangeNote] = useState('');
  const [err, setErr] = useState('');

  const createMut = useOwnerMutation(ownerOperationsApi.createCmsPage);
  const updateMut = useOwnerMutation(() => ownerOperationsApi.updateCmsPage(page!.id, { title, body, status, changeNote: changeNote || undefined }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      if (isNew) {
        await createMut.mutateAsync({ contentType, slug, title, body, status });
      } else {
        await updateMut.mutateAsync(undefined);
      }
      onClose();
    } catch (caught) {
      setErr(errorMessage(caught));
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto" onClose={onClose}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Create CMS content' : `Edit ${page.title} (v${page.currentVersion})`}</DialogTitle>
            <DialogDescription>Every save appends an immutable revision history entry.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {isNew ? (
              <>
                <Field label="Type">
                  <Select value={contentType} onChange={(e) => setContentType(e.target.value as CmsPageItem['contentType'])}>
                    <option value="page">Page</option>
                    <option value="faq">FAQ</option>
                    <option value="policy">Policy</option>
                    <option value="release_note">Release note</option>
                  </Select>
                </Field>
                <Field label="Slug">
                  <Input required value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="privacy-policy" />
                </Field>
              </>
            ) : null}
            <Field label="Status">
              <Select disabled={!canManage} value={status} onChange={(e) => setStatus(e.target.value as CmsPageItem['status'])}>
                <option value="draft">Draft</option>
                <option value="review">In review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
          </div>
          <Field label="Title"><Input required disabled={!canManage} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Content body">
            <textarea required rows={5} disabled={!canManage} className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>
          {!isNew && canManage ? (
            <Field label="Revision change note">
              <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="Updated GDPR retention section" />
            </Field>
          ) : null}
          {page?.revisions && page.revisions.length > 0 ? (
            <div className="space-y-1 text-xs">
              <p className="font-semibold">Revision history</p>
              <ul className="max-h-28 divide-y divide-border overflow-y-auto rounded border border-border px-2">
                {page.revisions.map((r) => (
                  <li key={r.id} className="flex justify-between py-1">
                    <span>v{r.versionNumber} · {r.changeNote ?? r.title}</span>
                    <span className="text-muted-foreground">{r.editor ?? 'Owner'} · {formatDateTime(r.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            {canManage ? <Button type="submit">{isNew ? 'Create content' : 'Save revision'}</Button> : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateReleaseDialog({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [releaseType, setReleaseType] = useState<ProductReleaseItem['releaseType']>('minor');
  const [featuresRaw, setFeaturesRaw] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const mut = useOwnerMutation(ownerOperationsApi.createRelease);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    const features = featuresRaw.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      await mut.mutateAsync({ version, title, releaseType, features, notes: notes || undefined });
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
            <DialogTitle>Log product release</DialogTitle>
            <DialogDescription>Track build deployment separately from public release note publication.</DialogDescription>
          </DialogHeader>
          {err ? <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Version"><Input required value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v2.5.0" /></Field>
            <Field label="Release type">
              <Select value={releaseType} onChange={(e) => setReleaseType(e.target.value as ProductReleaseItem['releaseType'])}>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="patch">Patch</option>
                <option value="hotfix">Hotfix</option>
              </Select>
            </Field>
          </div>
          <Field label="Release title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Key features (comma-separated)"><Input value={featuresRaw} onChange={(e) => setFeaturesRaw(e.target.value)} /></Field>
          <Field label="Summary notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mut.isPending}>Create release</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

