/**
 * Dashboards API: role templates, user-built dashboards, sharing and the widget query engine.
 *
 * Widget data always comes from POST /dashboards/query. The server applies the viewer's own
 * data scope (student → own records, teacher → allocated subjects, HOD → department, exam
 * department and management → institution), whatever the widget asks for.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';

export type FieldType = 'string' | 'number' | 'date' | 'boolean';
export type Aggregation = 'count' | 'count_distinct' | 'sum' | 'avg' | 'min' | 'max';
export type DateGrain = 'day' | 'month' | 'year';
export type WidgetType = 'kpi' | 'bar' | 'line' | 'pie' | 'table' | 'list';
export type ValueFormat = 'number' | 'decimal' | 'percent';
export type FilterOperator =
  | '=' | '!=' | '>' | '>=' | '<' | '<='
  | 'in' | 'not_in' | 'contains' | 'between'
  | 'last_days' | 'next_days' | 'is_null' | 'not_null';
export type HavingOperator = '=' | '!=' | '>' | '>=' | '<' | '<=';

export interface SourceField {
  key: string;
  label: string;
  type: FieldType;
  dimension: boolean;
  aggregations: Aggregation[];
  options: string[];
  group: string | null;
  custom: boolean;
}

export interface DataSource {
  key: string;
  label: string;
  description: string;
  fields: SourceField[];
}

export interface DashboardScope {
  level: 'self' | 'subjects' | 'department' | 'institution' | 'none';
  label: string;
}

export interface WidgetMeasure {
  field: string;
  agg: Aggregation;
  label?: string;
}

export interface WidgetDimension {
  field: string;
  grain?: DateGrain;
}

export interface WidgetFilter {
  field: string;
  op: FilterOperator;
  value?: unknown;
}

export interface WidgetHaving {
  measure: number;
  op: HavingOperator;
  value: number;
}

export interface WidgetSpec {
  source: string;
  measures: WidgetMeasure[];
  dimensions?: WidgetDimension[];
  filters?: WidgetFilter[];
  having?: WidgetHaving[];
  sort?: { by: string; dir: 'asc' | 'desc' } | null;
  limit?: number;
}

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetOptions {
  format?: ValueFormat;
  target?: number;
  stacked?: boolean;
  color?: string;
}

export interface Widget {
  id: string;
  title: string;
  type: WidgetType;
  spec: WidgetSpec;
  layout: WidgetLayout;
  options?: WidgetOptions;
}

export interface Dashboard {
  /** null for built-in templates. */
  id: number | null;
  key: string | null;
  name: string;
  description: string | null;
  templateKey: string | null;
  isTemplate: boolean;
  isOwner: boolean;
  isHome: boolean;
  owner: { id: number; name: string | null } | null;
  sharing: { roles: string[]; designationIds: number[]; audienceDefault: boolean };
  widgets: Widget[];
  updatedAt: string | null;
}

export interface ResultColumn {
  key: string;
  role: 'dimension' | 'measure';
  field: string;
  label: string;
  type: FieldType;
  agg?: Aggregation;
}

export type ResultRow = Record<string, string | number | boolean | null>;

export interface QueryResult {
  columns: ResultColumn[];
  rows: ResultRow[];
  truncated: boolean;
  scope: DashboardScope;
}

export type BatchResult =
  | ({ ok: true } & QueryResult)
  | { ok: false; status: number; message: string };

export interface DashboardList {
  data: Dashboard[];
  templates: Dashboard[];
  defaultTemplate: string;
}

export interface SaveDashboardInput {
  name?: string;
  description?: string | null;
  isHome?: boolean;
  fromTemplate?: string;
  fromDashboard?: number;
  widgets?: Widget[];
}

export interface ShareInput {
  roles: string[];
  designationIds: number[];
  audienceDefault: boolean;
}

export const dashboardsApi = {
  sources: () => http.get<{ data: DataSource[]; scope: DashboardScope }>('/dashboards/sources'),
  query: (spec: WidgetSpec) => http.post<{ data: QueryResult }>('/dashboards/query', { spec }).then((r) => r.data),
  queryMany: (specs: Record<string, WidgetSpec>) =>
    http.post<{ data: Record<string, BatchResult> }>('/dashboards/query', { specs }).then((r) => r.data),
  list: () => http.get<DashboardList>('/dashboards'),
  home: () => http.get<{ data: Dashboard }>('/dashboards/home').then((r) => r.data),
  show: (id: number) => http.get<{ data: Dashboard }>(`/dashboards/${id}`).then((r) => r.data),
  create: (input: SaveDashboardInput) => http.post<{ data: Dashboard }>('/dashboards', input).then((r) => r.data),
  update: (id: number, input: SaveDashboardInput) => http.patch<{ data: Dashboard }>(`/dashboards/${id}`, input).then((r) => r.data),
  remove: (id: number) => http.delete<{ message: string }>(`/dashboards/${id}`),
  share: (id: number, input: ShareInput) => http.put<{ data: Dashboard }>(`/dashboards/${id}/share`, input).then((r) => r.data),
};

export const dashboardKeys = {
  all: ['dashboards'] as const,
  list: ['dashboards', 'list'] as const,
  home: ['dashboards', 'home'] as const,
  sources: ['dashboards', 'sources'] as const,
  /** Widget data, keyed by the specs so edits refetch. */
  data: (specs: Record<string, WidgetSpec>) => ['dashboards', 'data', specs] as const,
};

export function useDashboardList() {
  return useQuery({ queryKey: dashboardKeys.list, queryFn: dashboardsApi.list });
}

export function useHomeDashboard() {
  return useQuery({ queryKey: dashboardKeys.home, queryFn: dashboardsApi.home });
}

export function useDataSources(enabled = true) {
  return useQuery({ queryKey: dashboardKeys.sources, queryFn: dashboardsApi.sources, enabled, staleTime: 5 * 60_000 });
}

/** Runs every widget of a dashboard in one request. */
export function useWidgetData(widgets: Widget[]) {
  const specs = Object.fromEntries(widgets.map((widget) => [widget.id, widget.spec]));

  return useQuery({
    queryKey: dashboardKeys.data(specs),
    queryFn: () => dashboardsApi.queryMany(specs),
    enabled: widgets.length > 0,
  });
}

export function useSaveDashboard() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: SaveDashboardInput }) =>
      id === null ? dashboardsApi.create(input) : dashboardsApi.update(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}

export function useDeleteDashboard() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => dashboardsApi.remove(id),
    onSuccess: () => client.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}

export function useShareDashboard() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ShareInput }) => dashboardsApi.share(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}
