/**
 * The institution's sidebar arrangement: per sidebar group, the order of its items and the items
 * hidden from everyone. Admins (settings.manage) change it from the sidebar's arrange mode.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export interface SidebarGroupLayout {
  order: string[];
  hidden: string[];
}

export interface SidebarLayout {
  groups: Record<string, SidebarGroupLayout>;
}

export const EMPTY_SIDEBAR_LAYOUT: SidebarLayout = { groups: {} };

export const sidebarLayoutApi = {
  get: () => http.get<{ data: SidebarLayout }>('/institution/sidebar-layout').then((r) => r.data),
  save: (layout: SidebarLayout) => http.put<{ data: SidebarLayout }>('/institution/sidebar-layout', layout).then((r) => r.data),
};

const sidebarLayoutKey = ['institution', 'sidebar-layout'] as const;

export function useSidebarLayout(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: sidebarLayoutKey,
    queryFn: sidebarLayoutApi.get,
    enabled: options.enabled ?? true,
    staleTime: 5 * 60 * 1000,
  });
}

/** Saves the whole layout. The sidebar updates at once and rolls back if saving fails. */
export function useSaveSidebarLayout() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: sidebarLayoutApi.save,
    onMutate: async (layout) => {
      await client.cancelQueries({ queryKey: sidebarLayoutKey });
      const previous = client.getQueryData<SidebarLayout>(sidebarLayoutKey);
      client.setQueryData(sidebarLayoutKey, layout);
      return { previous };
    },
    onError: (_error, _layout, context) => {
      if (context) client.setQueryData(sidebarLayoutKey, context.previous);
    },
    onSuccess: (layout) => client.setQueryData(sidebarLayoutKey, layout),
  });
}

/**
 * Items in the saved order (ids not in the saved order keep their default order after the listed
 * ones), without hidden items unless `includeHidden`.
 */
export function arrangeItems<T extends { id: string }>(
  items: T[],
  layout: SidebarGroupLayout | undefined,
  options: { includeHidden?: boolean; keepOrder?: boolean } = {},
): T[] {
  const position = new Map((options.keepOrder ? [] : layout?.order ?? []).map((id, index) => [id, index]));
  const hidden = new Set(layout?.hidden ?? []);
  const rank = (item: T, index: number) => position.get(item.id) ?? position.size + index;

  return items
    .map((item, index) => ({ item, rank: rank(item, index) }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item)
    .filter((item) => options.includeHidden || !hidden.has(item.id));
}
