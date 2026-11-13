import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Settings2, Trash2 } from 'lucide-react';
import {
  notificationsApi,
  parseLink,
  useNotificationMutation,
  useNotificationPreferences,
  useNotifications,
  type AppNotification,
  type NotificationPreference,
} from '../../api/notificationsApi';
import { Alert, AlertDescription, Badge, Button, Skeleton } from '../ui';

const CATEGORY_BADGE: Record<string, 'info' | 'success' | 'warning' | 'secondary'> = {
  placement: 'info',
  academics: 'success',
  announcements: 'warning',
  account: 'secondary',
};

function timeAgo(value: string): string {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} d ago` : new Date(value).toLocaleDateString();
}

interface NavigateProps {
  /** Opens an app tab; the notification link is "tab?params". */
  onNavigate?: (tab: string, params: Record<string, string>) => void;
}

function NotificationItem({ notification, onNavigate, compact }: { notification: AppNotification; compact?: boolean } & NavigateProps) {
  const read = useNotificationMutation((id: string) => notificationsApi.markRead(id));
  const remove = useNotificationMutation((id: string) => notificationsApi.remove(id));
  const target = parseLink(notification.link);

  const open = () => {
    if (!notification.readAt) read.mutate(notification.id);
    if (target && onNavigate) onNavigate(target.tab, target.params);
  };

  return (
    <li className={`flex gap-3 rounded-lg p-3 ${notification.readAt ? '' : 'bg-primary/5'}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-primary'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={open} className="text-left">
          <span className="block text-sm font-medium text-foreground">{notification.title}</span>
          {notification.body && !compact ? <span className="mt-0.5 block text-sm text-muted-foreground">{notification.body}</span> : null}
          {notification.body && compact ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.body}</span> : null}
        </button>
        <div className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground">
          <Badge variant={CATEGORY_BADGE[notification.category] ?? 'secondary'} className="px-1.5 py-0 text-2xs">{notification.category}</Badge>
          <span>{timeAgo(notification.createdAt)}</span>
          {notification.readAt ? null : <span className="sr-only">Unread</span>}
        </div>
      </div>
      {!compact ? (
        <Button type="button" variant="ghost" size="icon" aria-label="Delete notification" onClick={() => remove.mutate(notification.id)}>
          <Trash2 size={15} />
        </Button>
      ) : null}
    </li>
  );
}

/** Header bell: unread dot, the latest notifications and a link to all of them. */
export function NotificationBell({ onNavigate, onOpenAll }: NavigateProps & { onOpenAll: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useNotifications({ perPage: 8 });
  const readAll = useNotificationMutation(() => notificationsApi.markAllRead());
  const unread = notifications.data?.meta?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground shadow-card transition hover:border-primary/30 hover:text-foreground"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-card bg-destructive" aria-hidden="true" /> : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-2 shadow-dropdown">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <p className="text-sm font-semibold text-foreground">Notifications{unread ? ` · ${unread} unread` : ''}</p>
            {unread ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => readAll.mutate(undefined)}><CheckCheck size={14} /> Mark all read</Button>
            ) : null}
          </div>
          {notifications.isPending ? <Skeleton className="m-2 h-20" /> : Array.isArray(notifications.data?.data) && notifications.data.data.length ? (
            <ul className="max-h-96 space-y-1 overflow-y-auto">
              {notifications.data.data.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} compact onNavigate={(tab, params) => { setOpen(false); onNavigate?.(tab, params); }} />
              ))}
            </ul>
          ) : (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">You are all caught up.</p>
          )}
          <div className="border-t border-border px-2 pt-2">
            <Button type="button" variant="link" size="sm" onClick={() => { setOpen(false); onOpenAll(); }}>View all and preferences</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Full notifications page with unread filter, paging and email/in-app preferences. */
export function NotificationCenter({ onNavigate }: NavigateProps) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showPreferences, setShowPreferences] = useState(false);
  const notifications = useNotifications({ unread: unreadOnly, page });
  const readAll = useNotificationMutation(() => notificationsApi.markAllRead());
  const meta = notifications.data?.meta;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Updates about jobs, applications, offers and results.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={unreadOnly ? 'default' : 'outline'} onClick={() => { setUnreadOnly((value) => !value); setPage(1); }}>
            Unread only{meta?.unreadCount ? ` (${meta.unreadCount})` : ''}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!meta?.unreadCount} onClick={() => readAll.mutate(undefined)}><CheckCheck size={14} /> Mark all read</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setShowPreferences((value) => !value)} aria-expanded={showPreferences}><Settings2 size={14} /> Preferences</Button>
        </div>
      </header>

      {showPreferences ? <PreferencesPanel /> : null}

      <section className="rounded-xl border border-border bg-card p-2 shadow-card">
        {notifications.isPending ? <Skeleton className="m-2 h-32" /> : notifications.isError ? (
          <Alert variant="destructive"><AlertDescription>Notifications could not be loaded.</AlertDescription></Alert>
        ) : Array.isArray(notifications.data?.data) && notifications.data.data.length ? (
          <ul className="space-y-1">{notifications.data.data.map((notification) => <NotificationItem key={notification.id} notification={notification} onNavigate={onNavigate} />)}</ul>
        ) : (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">{unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}</p>
        )}
      </section>

      {meta && meta.lastPage > 1 ? (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span>Page {meta.currentPage} of {meta.lastPage}</span>
          <Button type="button" size="sm" variant="outline" disabled={page >= meta.lastPage} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      ) : null}
    </div>
  );
}

function PreferencesPanel() {
  const preferences = useNotificationPreferences();
  const save = useNotificationMutation((items: NotificationPreference[]) => notificationsApi.savePreferences(items));
  const [draft, setDraft] = useState<NotificationPreference[] | null>(null);
  const items = draft ?? preferences.data ?? [];

  const toggle = (category: string, key: 'inApp' | 'mail') =>
    setDraft(items.map((item) => (item.category === category ? { ...item, [key]: !item[key] } : item)));

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Choose what appears here and what is also emailed to you.</p>
      {preferences.isPending ? <Skeleton className="mt-3 h-24" /> : (
        <table className="mt-3 w-full text-sm">
          <thead><tr><th className="text-left">Category</th><th className="text-center">In the app</th><th className="text-center">Email</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.category}>
                <td><p className="font-medium text-foreground">{item.label}</p><p className="text-2xs text-muted-foreground">{item.description}</p></td>
                <td className="text-center"><input type="checkbox" aria-label={`${item.label} in the app`} checked={item.inApp} onChange={() => toggle(item.category, 'inApp')} className="h-4 w-4 accent-primary" /></td>
                <td className="text-center"><input type="checkbox" aria-label={`${item.label} by email`} checked={item.mail} onChange={() => toggle(item.category, 'mail')} className="h-4 w-4 accent-primary" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        {save.isSuccess && !draft ? <span className="text-xs text-success">Saved.</span> : null}
        <Button type="button" size="sm" disabled={!draft || save.isPending} onClick={() => draft && save.mutate(draft, { onSuccess: () => setDraft(null) })}>
          {save.isPending ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </section>
  );
}
