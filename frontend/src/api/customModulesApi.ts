/**
 * Modules institution admins create (e.g. "Hostel Rooms") and their records. A record has a
 * title and a status; every other attribute is a custom field under the module's `entity`
 * ("module_{id}"), managed with the custom fields API.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';
import { customFieldKeys, type CustomFieldValues } from './customFieldsApi';

export type CustomModuleCategory = 'Academics' | 'People & Roles' | 'Career & Placement' | 'Administration' | 'Operations';
export type CustomModuleViewRole = 'placement_officer' | 'staff' | 'student';
export type CustomModuleEditRole = 'placement_officer' | 'staff';
export type CustomModuleRecordStatus = 'active' | 'archived';

export interface CustomModule {
  id: number;
  key: string;
  entity: `module_${number}`;
  pluralLabel: string;
  singularLabel: string;
  category: CustomModuleCategory;
  description: string | null;
  viewRoles: CustomModuleViewRole[];
  editRoles: CustomModuleEditRole[];
  isActive: boolean;
  sortOrder: number;
  recordsCount?: number;
  canEdit: boolean;
  updatedAt: string | null;
}

export interface CustomModuleInput {
  key?: string;
  pluralLabel?: string;
  singularLabel?: string | null;
  category?: CustomModuleCategory;
  description?: string | null;
  viewRoles?: CustomModuleViewRole[];
  editRoles?: CustomModuleEditRole[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface CustomModuleRecord {
  id: number;
  moduleId: number;
  title: string;
  status: CustomModuleRecordStatus;
  customFields: CustomFieldValues;
  createdBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomModuleRecordInput {
  title?: string;
  status?: CustomModuleRecordStatus;
  customFields?: CustomFieldValues;
}

export interface CustomModuleRecordPage {
  data: CustomModuleRecord[];
  meta: { currentPage: number; lastPage: number; perPage: number; total: number };
}

export interface CustomModuleRecordQuery {
  search?: string;
  status?: CustomModuleRecordStatus;
  page?: number;
  perPage?: number;
}

/** Who can see and change a module's records, as offered when creating one. Admins always can. */
export const CUSTOM_MODULE_ACCESS_PRESETS: {
  value: string;
  label: string;
  viewRoles: CustomModuleViewRole[];
  editRoles: CustomModuleEditRole[];
}[] = [
  { value: 'admins', label: 'Admins only', viewRoles: [], editRoles: [] },
  { value: 'staff', label: 'Staff & placement officers', viewRoles: [], editRoles: ['staff', 'placement_officer'] },
  {
    value: 'staff_students',
    label: 'Staff edit, students view',
    viewRoles: ['student'],
    editRoles: ['staff', 'placement_officer'],
  },
];

const ROLE_LABELS: Record<CustomModuleViewRole, string> = {
  placement_officer: 'Placement',
  staff: 'Staff',
  student: 'Students',
};

/** Short "shared with" text for a module, e.g. "Admins, Staff, Students". */
export function describeModuleAccess(module: Pick<CustomModule, 'viewRoles' | 'editRoles'>): string {
  const roles = new Set<CustomModuleViewRole>([...module.editRoles, ...module.viewRoles]);
  return ['Admins', ...(['staff', 'placement_officer', 'student'] as const).filter((role) => roles.has(role)).map((role) => ROLE_LABELS[role])].join(', ');
}

/** Workspace page of a module's records: /app/module_{id}. */
export const customModuleTabId = (id: number) => `module_${id}`;

export function customModuleIdFromTab(tab: string): number | null {
  const match = /^module_([1-9]\d*)$/.exec(tab);
  return match ? Number(match[1]) : null;
}

export const customModulesApi = {
  list: () => http.get<{ data: CustomModule[] }>('/custom-modules').then((r) => r.data),
  reorder: (ids: number[]) => http.put<{ data: CustomModule[] }>('/custom-modules/order', { ids }).then((r) => r.data),
  create: (input: CustomModuleInput) => http.post<{ data: CustomModule }>('/custom-modules', input).then((r) => r.data),
  update: (id: number, input: CustomModuleInput) =>
    http.patch<{ data: CustomModule }>(`/custom-modules/${id}`, input).then((r) => r.data),
  remove: (id: number) => http.delete<{ message: string }>(`/custom-modules/${id}`),

  records: (moduleId: number, query: CustomModuleRecordQuery = {}) =>
    http.get<CustomModuleRecordPage>(`/custom-modules/${moduleId}/records`, { ...query }),
  createRecord: (moduleId: number, input: CustomModuleRecordInput) =>
    http.post<{ data: CustomModuleRecord }>(`/custom-modules/${moduleId}/records`, input).then((r) => r.data),
  updateRecord: (moduleId: number, id: number, input: CustomModuleRecordInput) =>
    http.patch<{ data: CustomModuleRecord }>(`/custom-modules/${moduleId}/records/${id}`, input).then((r) => r.data),
  removeRecord: (moduleId: number, id: number) => http.delete<{ message: string }>(`/custom-modules/${moduleId}/records/${id}`),
};

export const customModuleKeys = {
  all: ['custom-modules'] as const,
  list: () => ['custom-modules', 'list'] as const,
  records: (moduleId: number, query: CustomModuleRecordQuery = {}) => ['custom-modules', 'records', moduleId, query] as const,
};

export function useCustomModules(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: customModuleKeys.list(),
    queryFn: customModulesApi.list,
    enabled: options.enabled ?? true,
  });
}

export function useSaveCustomModule() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: CustomModuleInput }) =>
      id === null ? customModulesApi.create(input) : customModulesApi.update(id, input),
    onSuccess: () => client.invalidateQueries({ queryKey: customModuleKeys.all }),
  });
}

/** Saves a new module order (ids first to last). The list updates at once and rolls back on failure. */
export function useReorderCustomModules() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => customModulesApi.reorder(ids),
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: customModuleKeys.list() });
      const previous = client.getQueryData<CustomModule[]>(customModuleKeys.list());
      if (previous) {
        const position = new Map(ids.map((id, index) => [id, index]));
        const rank = (m: CustomModule) => position.get(m.id) ?? ids.length + previous.indexOf(m);
        client.setQueryData(customModuleKeys.list(), [...previous].sort((a, b) => rank(a) - rank(b)));
      }
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) client.setQueryData(customModuleKeys.list(), context.previous);
    },
    onSuccess: (modules) => client.setQueryData(customModuleKeys.list(), modules),
  });
}

export function useDeleteCustomModule() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customModulesApi.remove(id),
    // Deleting a module also removes its field definitions.
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: customModuleKeys.all }),
      client.invalidateQueries({ queryKey: customFieldKeys.all }),
    ]),
  });
}

export function useCustomModuleRecords(moduleId: number | null | undefined, query: CustomModuleRecordQuery = {}) {
  return useQuery({
    queryKey: customModuleKeys.records(moduleId ?? 0, query),
    queryFn: () => customModulesApi.records(moduleId as number, query),
    enabled: Boolean(moduleId),
  });
}

export function useSaveCustomModuleRecord(moduleId: number) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number | null; input: CustomModuleRecordInput }) =>
      id === null ? customModulesApi.createRecord(moduleId, input) : customModulesApi.updateRecord(moduleId, id, input),
    // Record counts are shown on the module list.
    onSuccess: () => client.invalidateQueries({ queryKey: customModuleKeys.all }),
  });
}

export function useDeleteCustomModuleRecord(moduleId: number) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customModulesApi.removeRecord(moduleId, id),
    onSuccess: () => client.invalidateQueries({ queryKey: customModuleKeys.all }),
  });
}
