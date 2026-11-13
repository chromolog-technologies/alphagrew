/** In-app notifications and per-category preferences, for every role (/notifications). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface AppNotification {
  id: string;
  type: string;
  category: 'placement' | 'academics' | 'announcements' | 'account' | string;
  title: string;
  body: string | null;
  /** App route, e.g. "placement?job=12". */
  link: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  data: AppNotification[];
  meta: { currentPage: number; lastPage: number; total: number; unreadCount: number };
}

export interface NotificationPreference {
  category: string;
  label: string;
  description: string;
  inApp: boolean;
  mail: boolean;
}

export const notificationsApi = {
  list: (params: { unread?: boolean; page?: number; perPage?: number } = {}) =>
    http.get<NotificationPage>('/notifications', { unread: params.unread ? 1 : undefined, page: params.page, perPage: params.perPage }).then((res) => ({
      data: Array.isArray(res?.data) ? res.data : [],
      meta: {
        currentPage: res?.meta?.currentPage ?? 1,
        lastPage: res?.meta?.lastPage ?? 1,
        total: res?.meta?.total ?? 0,
        unreadCount: res?.meta?.unreadCount ?? 0,
      },
    })),
  markRead: (id: string) => http.post<{ unreadCount: number }>(`/notifications/${id}/read`),
  markAllRead: () => http.post<{ unreadCount: number }>('/notifications/read-all'),
  remove: (id: string) => http.delete<{ unreadCount: number }>(`/notifications/${id}`),
  preferences: () => http.get<{ data: NotificationPreference[] }>('/notifications/preferences').then((response) => response.data),
  savePreferences: (preferences: Pick<NotificationPreference, 'category' | 'inApp' | 'mail'>[]) =>
    http.put<{ data: NotificationPreference[] }>('/notifications/preferences', { preferences }).then((response) => response.data),
};

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unread: boolean, page: number) => ['notifications', 'list', unread, page] as const,
  preferences: ['notifications', 'preferences'] as const,
};

/** The bell: newest notifications and the unread count, refreshed every minute. */
export const useNotifications = (options: { unread?: boolean; page?: number; perPage?: number; enabled?: boolean } = {}) =>
  useQuery({
    queryKey: notificationKeys.list(Boolean(options.unread), options.page ?? 1),
    queryFn: () => notificationsApi.list(options),
    enabled: options.enabled ?? true,
    refetchInterval: 60_000,
  });

export const useNotificationPreferences = () => useQuery({ queryKey: notificationKeys.preferences, queryFn: notificationsApi.preferences });

export function useNotificationMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }) });
}

/** "placement?job=12" → { tab: "placement", params: { job: "12" } } */
export function parseLink(link: string | null): { tab: string; params: Record<string, string> } | null {
  if (!link) return null;
  const [tab, query = ''] = link.split('?');
  return { tab, params: Object.fromEntries(new URLSearchParams(query)) };
}
