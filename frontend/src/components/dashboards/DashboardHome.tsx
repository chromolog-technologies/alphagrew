import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Home,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  type Dashboard,
  type Widget,
  useDashboardList,
  useDataSources,
  useDeleteDashboard,
  useHomeDashboard,
  useSaveDashboard,
  useWidgetData,
} from '../../api/dashboardsApi';
import { ApiError } from '../../api/http';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Skeleton,
} from '../ui';
import { adjustLayout, compact, newWidget, placeNew, type LayoutAction } from './dashboardUtils';
import { ShareDashboardDialog } from './ShareDashboardDialog';
import { WidgetBuilderSheet } from './WidgetBuilderSheet';
import { WidgetView } from './WidgetView';

const ROW_HEIGHT = 76;

interface DashboardHomeProps {
  canBuild: boolean;
  canShare: boolean;
  designations: { id: number; name: string }[];
}

type Selection = { kind: 'home' } | { kind: 'template'; key: string } | { kind: 'dashboard'; id: number };

/**
 * The dashboard page: opens on the user's home dashboard (their own, one shared with them
 * as default, or their role's template), lets them switch, customise a copy, build widgets,
 * arrange the grid and (admins) share with roles and designations.
 */
export function DashboardHome({ canBuild, canShare, designations }: DashboardHomeProps) {
  const list = useDashboardList();
  const home = useHomeDashboard();
  const save = useSaveDashboard();
  const remove = useDeleteDashboard();
  const sources = useDataSources(canBuild);

  const [selection, setSelection] = useState<Selection>({ kind: 'home' });
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState<Widget[]>([]);
  const [builderWidget, setBuilderWidget] = useState<Widget | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [nameDialog, setNameDialog] = useState<null | { mode: 'new' | 'copy' | 'rename'; name: string }>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** A dashboard just created, to open in edit mode once the refreshed list includes it. */
  const [editOnOpen, setEditOnOpen] = useState<number | null>(null);

  const current: Dashboard | undefined = useMemo(() => {
    if (selection.kind === 'home') return home.data;
    if (selection.kind === 'template') return list.data?.templates.find((item) => item.key === selection.key);
    return list.data?.data.find((item) => item.id === selection.id);
  }, [selection, home.data, list.data]);

  // Switching dashboards (or a refetch after saving) leaves edit mode, except for a
  // dashboard that was just created to be edited.
  useEffect(() => {
    const openForEditing = current?.id != null && current.id === editOnOpen;
    setEditing(openForEditing);
    setWorking(current?.widgets ?? []);
    if (openForEditing) setEditOnOpen(null);
  }, [current]);

  // Compacting for display closes gaps, e.g. where the server left out widgets the viewer can't use.
  const savedWidgets = useMemo(() => compact(current?.widgets ?? []), [current]);
  const widgets = editing ? working : savedWidgets;
  const data = useWidgetData(widgets);
  const dirty = editing && JSON.stringify(working) !== JSON.stringify(current?.widgets ?? []);
  const scope = Object.values(data.data ?? {}).find((result) => 'scope' in result);

  if (home.isLoading || list.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (home.error || list.error || !current) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {(home.error ?? list.error) instanceof ApiError ? (home.error ?? list.error)?.message : 'Dashboards could not be loaded.'}
        </AlertDescription>
      </Alert>
    );
  }

  const saveError = save.error instanceof ApiError
    ? Object.values(save.error.firstFieldErrors)[0] ?? save.error.message
    : save.error ? 'Saving failed.' : null;

  /** Creates a dashboard and opens it in edit mode. */
  const createAndOpen = (input: Parameters<typeof save.mutate>[0]['input']) =>
    save.mutate({ id: null, input }, {
      onSuccess: (created) => {
        setEditOnOpen(created.id);
        setSelection({ kind: 'dashboard', id: created.id as number });
      },
    });

  const startEditing = () => {
    setWorking(current.widgets);
    setEditing(true);
  };

  const saveWidgets = () => {
    if (current.id === null) return;
    save.mutate({ id: current.id, input: { widgets: compact(working) } }, { onSuccess: () => setEditing(false) });
  };

  const upsertWidget = (widget: Widget) => {
    setWorking((items) => {
      const exists = items.some((item) => item.id === widget.id);
      return compact(exists ? items.map((item) => (item.id === widget.id ? widget : item)) : [...items, widget], widget.id);
    });
    setBuilderWidget(null);
  };

  const openBuilderForNew = () => {
    const source = sources.data?.data[0];
    if (!source) return;
    setBuilderWidget(newWidget('bar', source.key, source.fields, working));
  };

  const duplicateWidget = (widget: Widget) => {
    const copy: Widget = { ...widget, id: `w${Date.now().toString(36)}`, title: `${widget.title} (copy)` };
    setWorking((items) => compact([...items, { ...copy, layout: placeNew(items, widget.layout) }]));
  };

  const move = (id: string, action: LayoutAction) => setWorking((items) => adjustLayout(items, id, action));

  const ownDashboards = list.data?.data.filter((item) => item.isOwner) ?? [];
  const sharedDashboards = list.data?.data.filter((item) => !item.isOwner) ?? [];
  const selectValue = selection.kind === 'home' ? 'home' : selection.kind === 'template' ? `t:${selection.key}` : `d:${selection.id}`;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-black text-slate-950">{current.name}</h1>
            {current.isTemplate ? <Badge variant="info">Built-in template</Badge> : null}
            {!current.isTemplate && !current.isOwner ? <Badge variant="secondary">Shared by {current.owner?.name ?? 'an admin'}</Badge> : null}
            {current.isHome ? <Badge variant="success">Your home</Badge> : null}
            {scope && 'scope' in scope ? <Badge variant="outline">Showing: {scope.scope.label}</Badge> : null}
          </div>
          {current.description ? <p className="mt-1 text-sm text-slate-500">{current.description}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-60">
            <Select
              aria-label="Choose dashboard"
              value={selectValue}
              onChange={(event) => {
                const value = event.target.value;
                setSelection(value === 'home' ? { kind: 'home' }
                  : value.startsWith('t:') ? { kind: 'template', key: value.slice(2) }
                  : { kind: 'dashboard', id: Number(value.slice(2)) });
              }}
            >
              <option value="home">My home dashboard</option>
              {ownDashboards.length ? (
                <optgroup label="My dashboards">
                  {ownDashboards.map((item) => <option key={item.id} value={`d:${item.id}`}>{item.name}</option>)}
                </optgroup>
              ) : null}
              {sharedDashboards.length ? (
                <optgroup label="Shared with me">
                  {sharedDashboards.map((item) => <option key={item.id} value={`d:${item.id}`}>{item.name}</option>)}
                </optgroup>
              ) : null}
              <optgroup label="Templates">
                {(list.data?.templates ?? []).map((item) => <option key={item.key} value={`t:${item.key}`}>{item.name}</option>)}
              </optgroup>
            </Select>
          </div>

          <Button type="button" variant="ghost" size="icon" aria-label="Refresh data" title="Refresh data" onClick={() => void data.refetch()}>
            <RefreshCw size={16} className={data.isFetching ? 'animate-spin' : ''} />
          </Button>

          {canBuild && current.isOwner && !editing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={startEditing}><LayoutGrid size={14} /> Edit</Button>
              {canShare ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setShareOpen(true)}><Share2 size={14} /> Share</Button>
              ) : null}
              {!current.isHome ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => save.mutate({ id: current.id, input: { isHome: true } })}>
                  <Home size={14} /> Set as home
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="icon" aria-label="Rename" title="Rename" onClick={() => setNameDialog({ mode: 'rename', name: current.name })}>
                <Pencil size={15} />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Delete dashboard" title="Delete dashboard" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} />
              </Button>
            </>
          ) : null}

          {canBuild && !current.isOwner ? (
            <Button type="button" size="sm" onClick={() => setNameDialog({ mode: 'copy', name: `${current.name} (my copy)` })}>
              <Copy size={14} /> Customise
            </Button>
          ) : null}

          {canBuild && !editing ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setNameDialog({ mode: 'new', name: '' })}>
              <Plus size={14} /> New dashboard
            </Button>
          ) : null}

          {editing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={openBuilderForNew} disabled={!sources.data?.data.length}>
                <Plus size={14} /> Add widget
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setWorking(current.widgets); setEditing(false); }}>Discard</Button>
              <Button type="button" size="sm" onClick={saveWidgets} disabled={!dirty || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {saveError ? (
        <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>
      ) : null}

      {editing ? (
        <p className="text-sm text-slate-500">
          Use the arrows on each widget to move it, the size buttons to resize it, and the pencil to change what it shows. Changes are saved when you click “Save changes”.
        </p>
      ) : null}

      {widgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-900">This dashboard has no widgets yet.</p>
          <p className="mt-1 text-sm text-slate-500">{current.isOwner && canBuild ? 'Click Edit, then Add widget to start.' : 'Nothing to show here.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" style={{ gridAutoRows: `${ROW_HEIGHT}px` }}>
          {widgets.map((widget) => (
            <article
              key={widget.id}
              className="flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs lg:[grid-column:var(--col)] lg:[grid-row:var(--row)]"
              style={{
                '--col': `${widget.layout.x + 1} / span ${widget.layout.w}`,
                '--row': `${widget.layout.y + 1} / span ${widget.layout.h}`,
                gridRow: `span ${widget.layout.h}`,
              } as React.CSSProperties}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="truncate text-sm font-bold text-slate-800" title={widget.title}>{widget.title}</h2>
                {editing ? <WidgetToolbar widget={widget} onMove={move} onEdit={() => setBuilderWidget(widget)} onDuplicate={() => duplicateWidget(widget)} onRemove={() => setWorking((items) => compact(items.filter((item) => item.id !== widget.id)))} /> : null}
              </div>
              <div className="min-h-0 flex-1">
                <WidgetView widget={widget} result={data.data?.[widget.id]} loading={data.isLoading} />
              </div>
            </article>
          ))}
        </div>
      )}

      {sources.data ? (
        <WidgetBuilderSheet
          open={builderWidget !== null}
          onOpenChange={(open) => !open && setBuilderWidget(null)}
          sources={sources.data.data}
          widget={builderWidget}
          onSave={upsertWidget}
        />
      ) : null}

      {current.id !== null && canShare ? (
        <ShareDashboardDialog open={shareOpen} onOpenChange={setShareOpen} dashboard={current} designations={designations} />
      ) : null}

      <Dialog open={nameDialog !== null} onOpenChange={(open) => !open && setNameDialog(null)}>
        <DialogContent className="max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!nameDialog?.name.trim()) return;
              const name = nameDialog.name.trim();
              if (nameDialog.mode === 'rename' && current.id !== null) {
                save.mutate({ id: current.id, input: { name } });
              } else if (nameDialog.mode === 'copy') {
                createAndOpen(current.isTemplate ? { name, fromTemplate: current.key ?? undefined } : { name, fromDashboard: current.id ?? undefined });
              } else {
                createAndOpen({ name, widgets: [] });
              }
              setNameDialog(null);
            }}
          >
            <DialogHeader>
              <DialogTitle>{nameDialog?.mode === 'rename' ? 'Rename dashboard' : nameDialog?.mode === 'copy' ? 'Customise a copy' : 'New dashboard'}</DialogTitle>
              <DialogDescription>
                {nameDialog?.mode === 'copy'
                  ? 'You get your own copy to change freely. The original stays as it is.'
                  : nameDialog?.mode === 'new' ? 'Start from an empty dashboard and add the widgets you need.' : ''}
              </DialogDescription>
            </DialogHeader>
            <Input
              className="mt-4"
              autoFocus
              maxLength={100}
              aria-label="Dashboard name"
              value={nameDialog?.name ?? ''}
              onChange={(event) => setNameDialog((currentDialog) => (currentDialog ? { ...currentDialog, name: event.target.value } : currentDialog))}
            />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setNameDialog(null)}>Cancel</Button>
              <Button type="submit" disabled={!nameDialog?.name.trim()}>{nameDialog?.mode === 'rename' ? 'Rename' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{current.name}”?</DialogTitle>
            <DialogDescription>
              {current.sharing.roles.length || current.sharing.designationIds.length
                ? 'It is shared, so it also disappears for everyone it is shared with.'
                : 'This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => current.id !== null && remove.mutate(current.id, {
                onSuccess: () => {
                  setConfirmDelete(false);
                  setSelection({ kind: 'home' });
                },
              })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WidgetToolbar({ widget, onMove, onEdit, onDuplicate, onRemove }: {
  widget: Widget;
  onMove: (id: string, action: LayoutAction) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const buttons: { action?: LayoutAction; label: string; icon: typeof ArrowUp; onClick?: () => void }[] = [
    { action: 'left', label: 'Move left', icon: ArrowLeft },
    { action: 'up', label: 'Move up', icon: ArrowUp },
    { action: 'down', label: 'Move down', icon: ArrowDown },
    { action: 'right', label: 'Move right', icon: ArrowRight },
    { action: 'narrower', label: 'Narrower', icon: Minimize2 },
    { action: 'wider', label: 'Wider', icon: Maximize2 },
    { action: 'shorter', label: 'Shorter', icon: ChevronsDownUp },
    { action: 'taller', label: 'Taller', icon: ChevronsUpDown },
    { label: 'Edit widget', icon: Pencil, onClick: onEdit },
    { label: 'Duplicate widget', icon: Copy, onClick: onDuplicate },
    { label: 'Remove widget', icon: Trash2, onClick: onRemove },
  ];

  return (
    <div className="flex shrink-0 flex-wrap justify-end gap-0.5">
      {buttons.map(({ action, label, icon: Icon, onClick }) => (
        <button
          key={label}
          type="button"
          aria-label={`${label}: ${widget.title}`}
          title={label}
          onClick={onClick ?? (() => action && onMove(widget.id, action))}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
