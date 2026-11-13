import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Globe,
  Hash,
  HelpCircle,
  Layers,
  Lock,
  Layout,
  Link as LinkIcon,
  ListFilter,
  Mail,
  Megaphone,
  MoreVertical,
  MoveDown,
  MoveUp,
  Pencil,
  Percent,
  Phone,
  Plus,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { apiCall } from '../../api/apiClient';
import {
  CUSTOM_FIELD_ENTITIES,
  CUSTOM_FIELD_TYPES,
  type CustomFieldDefinition,
  type CustomFieldEntity,
  type CustomFieldInput,
  type CustomFieldType,
  useCustomFieldDefinitions,
  useDeleteCustomField,
  useSaveCustomField,
} from '../../api/customFieldsApi';
import {
  CUSTOM_MODULE_ACCESS_PRESETS,
  type CustomModule,
  describeModuleAccess,
  useCustomModules,
  useDeleteCustomModule,
  useSaveCustomModule,
} from '../../api/customModulesApi';
import { ApiError } from '../../api/http';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  Skeleton,
} from '../ui';

export interface ModuleItem {
  id: string;
  name: string;
  entity: CustomFieldEntity | 'custom';
  pluralLabel: string;
  singularLabel: string;
  category: 'Academics' | 'People & Roles' | 'Career & Placement' | 'Administration' | 'Operations';
  icon: typeof Users;
  sharedTo: string;
  lastModified: string;
  isStandard: boolean;
  isActive: boolean;
  standardFields: { label: string; key: string; type: string; required?: boolean }[];
  /** Set for modules created by the institution (stored on the server). */
  serverId?: number;
  recordsCount?: number;
}

/** On/off state of the built-in modules, kept in the browser (icons can't be serialised). */
const MODULE_STATUS_STORAGE_KEY = 'alphagrew_modules_status';

function loadModuleStatus(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(MODULE_STATUS_STORAGE_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function formatModified(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/** A module created by the institution, as a catalog row. */
function toModuleItem(module: CustomModule): ModuleItem {
  return {
    id: `module_${module.id}`,
    name: module.key,
    entity: module.entity,
    pluralLabel: module.pluralLabel,
    singularLabel: module.singularLabel,
    category: module.category,
    icon: Layers,
    sharedTo: describeModuleAccess(module),
    lastModified: formatModified(module.updatedAt),
    isStandard: false,
    isActive: module.isActive,
    standardFields: [
      { label: `${module.singularLabel} Name / Title`, key: 'title', type: 'Text', required: true },
      { label: 'Status', key: 'status', type: 'Dropdown', required: true },
      { label: 'Created Date', key: 'created_at', type: 'Date' },
    ],
    serverId: module.id,
    recordsCount: module.recordsCount,
  };
}

const DEFAULT_MODULES: ModuleItem[] = [
  {
    id: 'students',
    name: 'students',
    entity: 'student',
    pluralLabel: 'Students',
    singularLabel: 'Student',
    category: 'Academics',
    icon: Users,
    sharedTo: 'All Profiles',
    lastModified: 'Nov 13, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Full Name', key: 'name', type: 'Text', required: true },
      { label: 'Email Address', key: 'email', type: 'Email', required: true },
      { label: 'Register / Roll No', key: 'roll_number', type: 'Text', required: true },
      { label: 'Department', key: 'department', type: 'Dropdown', required: true },
      { label: 'Batch / Year', key: 'batch', type: 'Text' },
      { label: 'Phone Number', key: 'phone', type: 'Phone' },
    ],
  },
  {
    id: 'staff',
    name: 'staff',
    entity: 'staff',
    pluralLabel: 'Staff & Faculty',
    singularLabel: 'Staff',
    category: 'People & Roles',
    icon: UserCheck,
    sharedTo: 'All Profiles',
    lastModified: 'Nov 12, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Full Name', key: 'name', type: 'Text', required: true },
      { label: 'Staff Email', key: 'email', type: 'Email', required: true },
      { label: 'Designation', key: 'designation', type: 'Dropdown', required: true },
      { label: 'Department', key: 'department', type: 'Dropdown', required: true },
      { label: 'Employee Code', key: 'employee_code', type: 'Text' },
      { label: 'Phone Number', key: 'phone', type: 'Phone' },
    ],
  },
  {
    id: 'companies',
    name: 'companies',
    entity: 'company',
    pluralLabel: 'Companies & Recruiters',
    singularLabel: 'Company',
    category: 'Career & Placement',
    icon: Briefcase,
    sharedTo: 'Placement & Admins',
    lastModified: 'Nov 10, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Company Name', key: 'name', type: 'Text', required: true },
      { label: 'Website URL', key: 'website', type: 'URL' },
      { label: 'Industry Domain', key: 'industry', type: 'Dropdown', required: true },
      { label: 'Primary Contact Person', key: 'contact_person', type: 'Text' },
      { label: 'Contact Email', key: 'contact_email', type: 'Email' },
      { label: 'Location / City', key: 'location', type: 'Text' },
    ],
  },
  {
    id: 'departments',
    name: 'departments',
    entity: 'department',
    pluralLabel: 'Departments',
    singularLabel: 'Department',
    category: 'Academics',
    icon: Building2,
    sharedTo: 'All Profiles',
    lastModified: 'Nov 13, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Department Name', key: 'name', type: 'Text', required: true },
      { label: 'Department Code', key: 'code', type: 'Text', required: true },
      { label: 'Head of Department (HOD)', key: 'hod_name', type: 'Text' },
      { label: 'Intake Capacity', key: 'intake_capacity', type: 'Number' },
      { label: 'Contact Email', key: 'contact_email', type: 'Email' },
      { label: 'Contact Phone', key: 'phone', type: 'Phone' },
    ],
  },
  {
    id: 'courses',
    name: 'courses',
    entity: 'course',
    pluralLabel: 'Courses & Programs',
    singularLabel: 'Course',
    category: 'Academics',
    icon: BookOpen,
    sharedTo: 'All Profiles',
    lastModified: 'Nov 13, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Course Name', key: 'name', type: 'Text', required: true },
      { label: 'Course Code', key: 'code', type: 'Text', required: true },
      { label: 'Department', key: 'department', type: 'Dropdown', required: true },
      { label: 'Academic Level / Degree', key: 'academic_level', type: 'Dropdown', required: true },
      { label: 'Course Type', key: 'course_type', type: 'Dropdown' },
      { label: 'Stream', key: 'stream', type: 'Text' },
      { label: 'Total Semesters', key: 'total_semesters', type: 'Number', required: true },
      { label: 'Total Credits', key: 'total_credits', type: 'Number' },
      { label: 'Intake Capacity', key: 'intake_capacity', type: 'Number' },
      { label: 'Total Fees (INR)', key: 'total_fees', type: 'Currency' },
    ],
  },
  {
    id: 'designations',
    name: 'designations',
    entity: 'designation',
    pluralLabel: 'Designations & Roles',
    singularLabel: 'Designation',
    category: 'People & Roles',
    icon: Shield,
    sharedTo: 'All Profiles',
    lastModified: 'Nov 13, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Designation Title', key: 'name', type: 'Text', required: true },
      { label: 'System Slug', key: 'slug', type: 'Text', required: true },
      { label: 'Department', key: 'department', type: 'Dropdown' },
      { label: 'Permissions Policy', key: 'permissions', type: 'Dropdown' },
      { label: 'Status', key: 'status', type: 'Dropdown' },
    ],
  },
  {
    id: 'subjects',
    name: 'subjects',
    entity: 'subject',
    pluralLabel: 'Subjects & Courses',
    singularLabel: 'Subject',
    category: 'Academics',
    icon: BookOpen,
    sharedTo: 'Faculty & Students',
    lastModified: 'Nov 06, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Subject Name', key: 'name', type: 'Text', required: true },
      { label: 'Subject Code', key: 'code', type: 'Text', required: true },
      { label: 'Credits', key: 'credits', type: 'Number', required: true },
      { label: 'Semester', key: 'semester', type: 'Dropdown' },
    ],
  },
  {
    id: 'exams',
    name: 'exams',
    entity: 'exam',
    pluralLabel: 'Exams & Assessments',
    singularLabel: 'Exam',
    category: 'Academics',
    icon: FileText,
    sharedTo: 'Faculty & Students',
    lastModified: 'Nov 04, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Exam Title', key: 'title', type: 'Text', required: true },
      { label: 'Exam Type', key: 'type', type: 'Dropdown', required: true },
      { label: 'Date', key: 'exam_date', type: 'Date', required: true },
      { label: 'Max Marks', key: 'max_marks', type: 'Number', required: true },
    ],
  },
  {
    id: 'attendance',
    name: 'attendance',
    entity: 'custom',
    pluralLabel: 'Attendance',
    singularLabel: 'Attendance Record',
    category: 'Operations',
    icon: Clock,
    sharedTo: 'All Profiles',
    lastModified: 'Nov 01, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Session Date', key: 'session_date', type: 'Date', required: true },
      { label: 'Status', key: 'status', type: 'Dropdown', required: true },
      { label: 'Remarks', key: 'remarks', type: 'Text' },
    ],
  },
  {
    id: 'fees',
    name: 'fees',
    entity: 'custom',
    pluralLabel: 'Fees & Payments',
    singularLabel: 'Fee Record',
    category: 'Administration',
    icon: CreditCard,
    sharedTo: 'Admins & Students',
    lastModified: 'Oct 28, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Fee Category', key: 'category', type: 'Dropdown', required: true },
      { label: 'Amount (INR)', key: 'amount', type: 'Currency', required: true },
      { label: 'Due Date', key: 'due_date', type: 'Date' },
    ],
  },
  {
    id: 'announcements',
    name: 'announcements',
    entity: 'custom',
    pluralLabel: 'Announcements',
    singularLabel: 'Announcement',
    category: 'Operations',
    icon: Megaphone,
    sharedTo: 'All Profiles',
    lastModified: 'Oct 25, 2026',
    isStandard: true,
    isActive: true,
    standardFields: [
      { label: 'Title', key: 'title', type: 'Text', required: true },
      { label: 'Target Audience', key: 'audience', type: 'Dropdown', required: true },
      { label: 'Published At', key: 'published_at', type: 'Date' },
    ],
  },
];

const FIELD_PALETTE_ITEMS = [
  { type: 'text' as CustomFieldType, label: 'Single Line Text', icon: FileText, desc: 'Names, codes, short strings' },
  { type: 'text' as CustomFieldType, label: 'Multi-line Text Area', icon: FileText, desc: 'Addresses, notes, descriptions' },
  { type: 'number' as CustomFieldType, label: 'Number / Integer', icon: Hash, desc: 'Rank, count, room number' },
  { type: 'number' as CustomFieldType, label: 'Decimal / Currency', icon: DollarSign, desc: 'Package, fees, GPA, percentages' },
  { type: 'date' as CustomFieldType, label: 'Date', icon: Calendar, desc: 'Date of birth, expiry date' },
  { type: 'select' as CustomFieldType, label: 'Dropdown (Pick List)', icon: ListFilter, desc: 'Single choice from list' },
  { type: 'multiselect' as CustomFieldType, label: 'Multi-Select', icon: Layers, desc: 'Multiple choices from list' },
  { type: 'boolean' as CustomFieldType, label: 'Checkbox (Yes / No)', icon: CheckCircle2, desc: 'Binary toggle flag' },
];

type Draft = {
  id: number | null;
  entity: CustomFieldEntity;
  label: string;
  key: string;
  type: CustomFieldType;
  options: string;
  helpText: string;
  isRequired: boolean;
  isActive: boolean;
};

const emptyDraft = (entity: CustomFieldEntity, defaultType: CustomFieldType = 'text', defaultLabel = ''): Draft => ({
  id: null,
  entity,
  label: defaultLabel,
  key: '',
  type: defaultType,
  options: 'Option 1\nOption 2\nOption 3',
  helpText: '',
  isRequired: false,
  isActive: true,
});

const hasOptions = (type: CustomFieldType) => type === 'select' || type === 'multiselect';

export interface CustomFieldsModuleProps {
  departments?: { id: number; name: string; code?: string }[];
  designations?: { id: number; name: string }[];
  courses?: { id: number; name: string; code?: string }[];
  studentsCount?: number;
  staffCount?: number;
  companiesCount?: number;
}

export function CustomFieldsModule({
  departments = [],
  designations = [],
  courses = [],
  studentsCount = 0,
  staffCount = 0,
  companiesCount = 0,
}: CustomFieldsModuleProps = {}) {
  const [activeTab, setActiveTab] = useState<'modules' | 'webtabs' | 'global_sets'>('modules');
  const [builtInStatus, setBuiltInStatus] = useState<Record<string, boolean>>(loadModuleStatus);
  const customModules = useCustomModules();
  const saveModule = useSaveCustomModule();
  const removeModule = useDeleteCustomModule();

  const modules = useMemo<ModuleItem[]>(
    () => [
      ...DEFAULT_MODULES.map((m) => (m.id in builtInStatus ? { ...m, isActive: builtInStatus[m.id] } : m)),
      ...(customModules.data ?? []).map(toModuleItem),
    ],
    [builtInStatus, customModules.data],
  );

  const [coursesList, setCoursesList] = useState<{ id: number; name: string; code?: string }[]>(courses);

  useEffect(() => {
    if (courses && courses.length > 0) {
      setCoursesList(courses);
      return;
    }
    let isDisposed = false;
    apiCall('/courses', 'GET')
      .then((res) => {
        if (!isDisposed && Array.isArray(res)) {
          setCoursesList(res);
        }
      })
      .catch(() => {});
    return () => {
      isDisposed = true;
    };
  }, [courses]);

  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'all' | 'standard' | 'custom'>('all');

  // Studio / Builder View
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);
  const [layoutViewMode, setLayoutViewMode] = useState<'create' | 'quick_create' | 'detail'>('create');
  const [sections, setSections] = useState<string[]>(['Standard Information', 'Institution Custom Details']);

  // Custom field CRUD
  // Only modules backed by a custom field entity on the server can hold custom fields: the built-in
  // record types and modules created here ("module_{id}"). The others ('custom': Attendance, Fees,
  // Announcements) have a fixed schema, and must never fall back to another entity, or their
  // fields would land on that entity's forms.
  const supportsCustomFields = selectedModule !== null && selectedModule.entity !== 'custom';
  const currentEntity: CustomFieldEntity | null = supportsCustomFields ? (selectedModule.entity as CustomFieldEntity) : null;
  const definitions = useCustomFieldDefinitions(currentEntity ?? undefined, {
    includeInactive: true,
    enabled: currentEntity !== null,
  });
  const save = useSaveCustomField();
  const remove = useDeleteCustomField();

  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<CustomFieldDefinition | null>(null);
  const [newModuleModalOpen, setNewModuleModalOpen] = useState(false);
  const [newSectionModalOpen, setNewSectionModalOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  // New module draft
  const emptyModuleDraft = {
    pluralLabel: '',
    singularLabel: '',
    category: 'Academics' as ModuleItem['category'],
    access: CUSTOM_MODULE_ACCESS_PRESETS[1].value,
  };
  const [newModuleDraft, setNewModuleDraft] = useState(emptyModuleDraft);
  const [deletingModule, setDeletingModule] = useState<ModuleItem | null>(null);
  const moduleErrors = saveModule.error instanceof ApiError ? saveModule.error.firstFieldErrors : {};
  const moduleFormError =
    saveModule.error instanceof ApiError
      ? Object.keys(moduleErrors).length === 0
        ? saveModule.error.message
        : null
      : saveModule.error
        ? 'The module could not be saved.'
        : null;

  const errors = save?.error instanceof ApiError ? save.error.firstFieldErrors : {};
  const formError = save?.error instanceof ApiError && Object.keys(errors).length === 0 ? save.error.message : null;

  // Toggle module active
  const toggleModuleStatus = (mod: ModuleItem) => {
    if (mod.serverId !== undefined) {
      // Server modules: switching off removes access for everyone but admins.
      saveModule.mutate({ id: mod.serverId, input: { isActive: !mod.isActive } });
      return;
    }
    setBuiltInStatus((prev) => {
      const updated = { ...prev, [mod.id]: !mod.isActive };
      localStorage.setItem(MODULE_STATUS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const getRecordCount = (mod: ModuleItem): number | null => {
    if (mod.serverId !== undefined) return mod.recordsCount ?? 0;
    switch (mod.id) {
      case 'students':
        return studentsCount;
      case 'staff':
        return staffCount;
      case 'companies':
        return companiesCount;
      case 'departments':
        return departments.length;
      case 'courses':
        return coursesList.length;
      case 'designations':
        return designations.length;
      default:
        return null;
    }
  };

  const handleCreateModule = () => {
    if (!newModuleDraft.pluralLabel.trim()) return;
    const access = CUSTOM_MODULE_ACCESS_PRESETS.find((p) => p.value === newModuleDraft.access) ?? CUSTOM_MODULE_ACCESS_PRESETS[0];
    saveModule.mutate(
      {
        id: null,
        input: {
          pluralLabel: newModuleDraft.pluralLabel.trim(),
          singularLabel: newModuleDraft.singularLabel.trim() || null,
          category: newModuleDraft.category,
          viewRoles: access.viewRoles,
          editRoles: access.editRoles,
        },
      },
      {
        onSuccess: (created) => {
          setNewModuleModalOpen(false);
          setNewModuleDraft(emptyModuleDraft);
          setSelectedModule(toModuleItem(created));
        },
      },
    );
  };

  const confirmDeleteModule = () => {
    if (deletingModule?.serverId === undefined) return;
    removeModule.mutate(deletingModule.serverId, {
      onSuccess: () => {
        setDeletingModule(null);
        setSelectedModule(null);
      },
    });
  };

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    setSections((prev) => [...prev, newSectionTitle.trim()]);
    setNewSectionTitle('');
    setNewSectionModalOpen(false);
  };

  const openCreateField = (type: CustomFieldType = 'text', labelPrefix = '', initialOptions?: string) => {
    if (currentEntity === null) return;
    save?.reset?.();
    const newDraft = emptyDraft(currentEntity, type, labelPrefix);
    if (initialOptions) {
      newDraft.options = initialOptions;
    }
    setDraft(newDraft);
  };

  const openEditField = (field: CustomFieldDefinition) => {
    save?.reset?.();
    setDraft({
      id: field.id,
      entity: field.entity,
      label: field.label,
      key: field.key,
      type: field.type,
      options: field.options.join('\n'),
      helpText: field.helpText ?? '',
      isRequired: field.isRequired,
      isActive: field.isActive,
    });
  };

  const submitField = () => {
    if (!draft) return;
    const input: CustomFieldInput = {
      label: draft.label.trim(),
      type: draft.type,
      helpText: draft.helpText.trim() || null,
      isRequired: draft.isRequired,
      isActive: draft.isActive,
      ...(hasOptions(draft.type)
        ? { options: draft.options.split('\n').map((o) => o.trim()).filter(Boolean) }
        : {}),
      ...(draft.id === null ? { entity: draft.entity, key: draft.key.trim() || undefined } : {}),
    };
    save?.mutate?.({ id: draft.id, input }, { onSuccess: () => setDraft(null) });
  };

  const moveField = (field: CustomFieldDefinition, direction: -1 | 1) => {
    const list = definitions?.data ?? [];
    const index = list.findIndex((item) => item.id === field.id);
    const other = list[index + direction];
    if (!other) return;
    list.forEach((item, position) => {
      const sortOrder = item.id === field.id ? index + direction : item.id === other.id ? index : position;
      if (item.sortOrder !== sortOrder) save?.mutate?.({ id: item.id, input: { sortOrder } });
    });
  };

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      if (moduleFilter === 'standard' && !m.isStandard) return false;
      if (moduleFilter === 'custom' && m.isStandard) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return m.pluralLabel.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [modules, moduleFilter, searchQuery]);

  const customFieldsCount = definitions?.data?.length ?? 0;
  const customFieldsRemaining = Math.max(0, 100 - customFieldsCount);

  // -------------------------------------------------------------
  // VIEW: MODULE LAYOUT BUILDER (Image 2)
  // -------------------------------------------------------------
  if (selectedModule) {
    const IconComponent = selectedModule.icon;
    return (
      <div className="space-y-4">
        {/* Top Navbar matching Image 2 */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedModule(null)}
              className="gap-1 text-slate-700 hover:text-slate-900"
            >
              <ArrowLeft size={14} /> Back to Modules
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <IconComponent size={18} />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  {selectedModule.pluralLabel} <span className="font-normal text-slate-400">/ Standard Layout</span>
                </h1>
                <p className="text-xs text-slate-500">Form fields & layout customization for {selectedModule.pluralLabel}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLayoutViewMode('create')}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  layoutViewMode === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setLayoutViewMode('quick_create')}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  layoutViewMode === 'quick_create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Quick Create
              </button>
              <button
                type="button"
                onClick={() => setLayoutViewMode('detail')}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  layoutViewMode === 'detail' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Detail View
              </button>
            </div>

            {selectedModule.serverId !== undefined ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  removeModule.reset();
                  setDeletingModule(selectedModule);
                }}
              >
                <Trash2 size={13} /> Delete Module
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedModule(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setSelectedModule(null)}
            >
              Save and Close
            </Button>
          </div>
        </div>

        {/* Builder Studio Grid: Left Palette + Center Canvas */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          {/* Left Palette: Field Types */}
          <div className="space-y-4 lg:col-span-4 xl:col-span-3">
            {!supportsCustomFields ? (
              <Card className="p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-slate-700">
                  <Lock size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">Fixed Schema</span>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedModule.pluralLabel} has a fixed set of fields. Custom fields can't be added to this module.
                </p>
              </Card>
            ) : (
            <Card className="p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">New Fields</span>
                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50">
                  {customFieldsRemaining} Left
                </Badge>
              </div>

              <p className="mb-3 text-xs text-slate-500">Click any field type to add it to this module:</p>

              <div className="space-y-1.5">
                {FIELD_PALETTE_ITEMS.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openCreateField(item.type, item.label.replace(/ \(.*/, ''))}
                      className="group flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 text-left transition hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <ItemIcon size={14} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-900">{item.label}</p>
                          <p className="text-[10px] text-slate-400">{item.desc}</p>
                        </div>
                      </div>
                      <Plus size={14} className="text-slate-400 group-hover:text-blue-600" />
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Components</span>
                <button
                  type="button"
                  onClick={() => setNewSectionModalOpen(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition"
                >
                  <Plus size={14} /> Add New Section
                </button>
              </div>
            </Card>
            )}
          </div>

          {/* Center Canvas: Form Sections & Fields Layout */}
          <div className="space-y-5 lg:col-span-8 xl:col-span-9">
            {/* Section 1: Standard System Fields */}
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800">Standard Information</h2>
                  <Badge variant="secondary" className="text-[10px]">
                    System Default
                  </Badge>
                </div>
                <span className="text-xs text-slate-400">{selectedModule.standardFields.length} Standard Fields</span>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedModule.standardFields.map((fld) => (
                    <div
                      key={fld.key}
                      className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-400 border border-slate-200">
                          <FileText size={13} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">
                            {fld.label} {fld.required ? <span className="text-rose-500">*</span> : null}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{fld.key}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-slate-500">
                        {fld.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {!supportsCustomFields ? (
              <Alert>
                <Lock size={16} />
                <AlertDescription>
                  Custom fields are not available for {selectedModule.pluralLabel}. It uses a fixed schema, so only the
                  standard fields above are shown on its forms.
                </AlertDescription>
              </Alert>
            ) : (
            <>
            {/* Section 2: Institution Custom Fields */}
            <Card className="overflow-hidden border-blue-200 bg-linear-to-b from-blue-50/20 to-white shadow-sm">
              <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900">Custom Fields & Layout</h2>
                  <Badge className="bg-blue-600 text-white text-[10px]">{customFieldsCount} Configured</Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 border-blue-200 bg-white text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  onClick={() => openCreateField('text')}
                >
                  <Plus size={13} /> Add Custom Field
                </Button>
              </div>

              <div className="p-5">
                {definitions?.isLoading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : definitions?.error ? (
                  <Alert variant="destructive">
                    <AlertDescription>Custom fields could not be loaded from server.</AlertDescription>
                  </Alert>
                ) : (definitions?.data ?? []).length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
                      <Plus size={22} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No custom fields for {selectedModule.pluralLabel} yet</h3>
                    <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                      Add custom fields such as hostel, blood group, scholarship, parent income, or domain-specific attributes.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openCreateField('text')}
                      className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus size={14} /> Create First Field
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(definitions.data ?? []).map((field, index, list) => {
                      const TypeBadge = CUSTOM_FIELD_TYPES.find((t) => t.value === field.type)?.label ?? field.type;
                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs hover:border-blue-300 transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                              <FileText size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {field.label} {field.isRequired ? <span className="text-rose-500">*</span> : null}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                  {TypeBadge}
                                </Badge>
                                {!field.isActive ? (
                                  <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-200 bg-amber-50">
                                    Hidden
                                  </Badge>
                                ) : null}
                                <span className="text-[10px] text-slate-400 font-mono truncate">{field.key}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0 ml-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              disabled={index === 0 || Boolean(save?.isPending)}
                              onClick={() => moveField(field, -1)}
                              aria-label="Move up"
                            >
                              <MoveUp size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-slate-700"
                              disabled={index === list.length - 1 || Boolean(save?.isPending)}
                              onClick={() => moveField(field, 1)}
                              aria-label="Move down"
                            >
                              <MoveDown size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-blue-600"
                              onClick={() => openEditField(field)}
                              aria-label="Edit field"
                            >
                              <Pencil size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-rose-600"
                              onClick={() => setDeleting(field)}
                              aria-label="Delete field"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Additional Custom Sections */}
            {sections
              .filter((sec) => sec !== 'Standard Information' && sec !== 'Institution Custom Details')
              .map((secName, secIdx) => (
                <Card key={secIdx} className="overflow-hidden border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                    <h3 className="text-sm font-bold text-slate-800">{secName}</h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-xs text-blue-600"
                      onClick={() => openCreateField('text', `${secName} Item`)}
                    >
                      <Plus size={13} /> Add Field
                    </Button>
                  </div>
                  <div className="p-6 text-center text-xs text-slate-400">
                    Drag or add fields to this section from the left palette.
                  </div>
                </Card>
              ))}
            </>
            )}
          </div>
        </div>

        {/* Create/Edit Field Dialog */}
        <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
          <DialogContent className="max-w-lg">
            {draft ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitField();
                }}
              >
                <DialogHeader>
                  <DialogTitle>{draft.id === null ? `Add Field to ${selectedModule.pluralLabel}` : `Edit “${draft.label}”`}</DialogTitle>
                  <DialogDescription>
                    {draft.id === null
                      ? `Create a custom attribute for ${selectedModule.pluralLabel.toLowerCase()}.`
                      : 'Update label, options, validation and visibility.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-label">Field Label</Label>
                    <Input
                      id="cf-label"
                      required
                      placeholder="e.g. Hostel Block / Scholarship Type"
                      maxLength={100}
                      value={draft.label}
                      onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                      error={Boolean(errors.label)}
                    />
                    {errors.label ? <p className="text-xs text-red-600">{errors.label}</p> : null}
                  </div>

                  {draft.id === null ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="cf-key">System Key (API / DB identifier)</Label>
                      <Input
                        id="cf-key"
                        placeholder="Auto-generated if left blank (e.g. hostel_block)"
                        maxLength={50}
                        value={draft.key}
                        onChange={(event) => setDraft({ ...draft, key: event.target.value })}
                        error={Boolean(errors.key)}
                      />
                      <p className="text-[11px] text-slate-400">Lowercase letters, numbers, and underscores.</p>
                      {errors.key ? <p className="text-xs text-red-600">{errors.key}</p> : null}
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor="cf-type">Field Type</Label>
                    <Select
                      id="cf-type"
                      value={draft.type}
                      onChange={(event) => setDraft({ ...draft, type: event.target.value as CustomFieldType })}
                    >
                      {CUSTOM_FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Select>
                    {errors.type ? <p className="text-xs text-red-600">{errors.type}</p> : null}
                  </div>

                  {hasOptions(draft.type) ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cf-options">Picklist Options (one per line)</Label>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {draft.options.split('\n').filter((s) => s.trim()).length} options configured
                        </span>
                      </div>

                      {/* Dynamic DB Table Source Buttons */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-slate-700">
                          <Database size={13} className="text-blue-600" />
                          <span>Dynamic Data Sources:</span>
                          <span className="text-[10px] text-slate-400 font-normal">Click to auto-populate from database tables</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {departments.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const names = departments.map((d) => d.name).join('\n');
                                setDraft({ ...draft, options: names });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 transition shadow-2xs"
                              title="Populate from live Departments table"
                            >
                              <Building2 size={11} />
                              From Departments ({departments.length})
                            </button>
                          )}

                          {designations.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const names = designations.map((d) => d.name).join('\n');
                                setDraft({ ...draft, options: names });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 transition shadow-2xs"
                              title="Populate from live Designations table"
                            >
                              <Shield size={11} />
                              From Designations ({designations.length})
                            </button>
                          )}

                          {coursesList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const names = coursesList.map((c) => c.name).join('\n');
                                setDraft({ ...draft, options: names });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition shadow-2xs"
                              title="Populate from live Courses table"
                            >
                              <BookOpen size={11} />
                              From Courses ({coursesList.length})
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setDraft({ ...draft, options: 'O+\nO-\nA+\nA-\nB+\nB-\nAB+\nAB-' });
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                          >
                            Blood Groups
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDraft({
                                ...draft,
                                options: 'Semester 1\nSemester 2\nSemester 3\nSemester 4\nSemester 5\nSemester 6\nSemester 7\nSemester 8',
                              });
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                          >
                            Semesters (1-8)
                          </button>
                        </div>
                      </div>

                      <textarea
                        id="cf-options"
                        rows={4}
                        value={draft.options}
                        onChange={(event) => setDraft({ ...draft, options: event.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-mono text-xs"
                        placeholder="Option 1&#10;Option 2&#10;Option 3"
                      />
                      {errors.options || errors['options.0'] ? (
                        <p className="text-xs text-red-600">{errors.options ?? errors['options.0']}</p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor="cf-help">Help Text / Placeholder Tooltip (optional)</Label>
                    <Input
                      id="cf-help"
                      maxLength={255}
                      placeholder="Guidance shown below the field"
                      value={draft.helpText}
                      onChange={(event) => setDraft({ ...draft, helpText: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.isRequired}
                        onChange={(event) => setDraft({ ...draft, isRequired: event.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Mark as Required on forms
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Show on forms, lists, and dashboards
                    </label>
                  </div>

                  {formError ? (
                    <Alert variant="destructive">
                      <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={Boolean(save?.isPending) || !draft.label.trim()}
                  >
                    {save?.isPending ? 'Saving…' : 'Save Field'}
                  </Button>
                </DialogFooter>
              </form>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete “{deleting?.label}”?</DialogTitle>
              <DialogDescription>
                This field will be removed from {selectedModule.pluralLabel} forms and views. Any historical values stored on
                existing records will be safely archived.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={Boolean(remove?.isPending)}
                onClick={() => deleting && remove?.mutate?.(deleting.id, { onSuccess: () => setDeleting(null) })}
              >
                Delete Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Module Dialog (modules created by the institution) */}
        <Dialog open={deletingModule !== null} onOpenChange={(open) => !open && setDeletingModule(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete the “{deletingModule?.pluralLabel}” module?</DialogTitle>
              <DialogDescription>
                The module, its custom fields and all its records ({deletingModule?.recordsCount ?? 0}) will be removed for
                everyone. Its key stays reserved.
              </DialogDescription>
            </DialogHeader>
            {removeModule.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {removeModule.error instanceof ApiError ? removeModule.error.message : 'The module could not be deleted.'}
                </AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDeletingModule(null)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" disabled={removeModule.isPending} onClick={confirmDeleteModule}>
                {removeModule.isPending ? 'Deleting…' : 'Delete Module'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Section Dialog */}
        <Dialog open={newSectionModalOpen} onOpenChange={setNewSectionModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Form Section</DialogTitle>
              <DialogDescription>Organize your custom fields into grouped sections.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-2">
              <Label htmlFor="sec-title">Section Name</Label>
              <Input
                id="sec-title"
                placeholder="e.g. Hostel & Transportation, Health Information"
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setNewSectionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleAddSection}
                disabled={!newSectionTitle.trim()}
              >
                Add Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MODULES LIST (Image 1 - Zoho CRM Style)
  // -------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Top Banner & Header */}
      <Card className="p-6 shadow-sm border-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">Modules and Fields</h1>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 text-[11px] font-semibold">
                <Sparkles size={11} className="text-amber-600" /> Customization
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage platform and campus modules, customize field layouts, picklists, and add institution-specific fields.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700 font-semibold gap-1.5 shadow-sm"
              onClick={() => {
                saveModule.reset();
                setNewModuleModalOpen(true);
              }}
            >
              <Plus size={16} /> Create New Module
            </Button>
          </div>
        </div>

        {/* Tabs: Modules | Web Tabs | Global Sets */}
        <div className="mt-6 flex items-center gap-6 border-b border-slate-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('modules')}
            className={`flex items-center gap-1.5 pb-3 border-b-2 transition ${
              activeTab === 'modules'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'modules' ? 'text-blue-600' : 'text-slate-400'} />
            Modules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webtabs')}
            className={`flex items-center gap-1.5 pb-3 border-b-2 transition ${
              activeTab === 'webtabs'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe size={14} />
            Web Tabs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global_sets')}
            className={`flex items-center gap-1.5 pb-3 border-b-2 transition ${
              activeTab === 'global_sets'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListFilter size={14} />
            Global Sets
          </button>
        </div>

        {activeTab === 'modules' && (
          <>
            {/* Filter and Search Bar matching Image 1 */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search modules..."
                  className="pl-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant={moduleFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModuleFilter('all')}
                  className={moduleFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600'}
                >
                  All ({modules.length})
                </Button>
                <Button
                  type="button"
                  variant={moduleFilter === 'standard' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModuleFilter('standard')}
                  className={moduleFilter === 'standard' ? 'bg-slate-900 text-white' : 'text-slate-600'}
                >
                  Standard
                </Button>
                <Button
                  type="button"
                  variant={moduleFilter === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModuleFilter('custom')}
                  className={moduleFilter === 'custom' ? 'bg-slate-900 text-white' : 'text-slate-600'}
                >
                  Custom Modules
                </Button>
              </div>
            </div>

            {/* Modules Table matching Image 1 */}
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Displayed In Tabs As</th>
                      <th className="py-3 px-4">Module Name</th>
                      <th className="py-3 px-4">Teamspace</th>
                      <th className="py-3 px-4">Shared To</th>
                      <th className="py-3 px-4">Last Modified</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredModules.map((mod) => {
                      const ModIcon = mod.icon;
                      return (
                        <tr key={mod.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <ModIcon size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-sm">{mod.pluralLabel}</span>
                                  {!mod.isStandard ? (
                                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">
                                      Custom
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {getRecordCount(mod) !== null && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                      <Database size={10} className="text-slate-400" />
                                      {getRecordCount(mod)} records
                                    </span>
                                  )}
                                  {mod.entity !== 'custom' ? (
                                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                                      Custom fields
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                      <Lock size={10} className="text-slate-400" />
                                      Fixed schema
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-500">{mod.name}</td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                              {mod.category}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600">{mod.sharedTo}</td>

                          <td className="py-3 px-4 text-slate-400">{mod.lastModified}</td>

                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => toggleModuleStatus(mod)}
                              disabled={mod.serverId !== undefined && saveModule.isPending}
                              className="inline-flex items-center gap-1 transition focus:outline-none"
                              aria-label={`Toggle ${mod.pluralLabel} status`}
                            >
                              {mod.isActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200">
                                  Disabled
                                </span>
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 border-blue-200 bg-white font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700 shadow-2xs"
                              onClick={() => setSelectedModule(mod)}
                            >
                              <Layout size={13} /> Customize Fields
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab: Web Tabs */}
        {activeTab === 'webtabs' && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <Globe size={28} className="mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Web Tabs</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Embed external university portals, library links, or LMS dashboards directly inside your campus navigation.
            </p>
            <Button type="button" size="sm" className="mt-4 bg-blue-600 text-white" disabled>
              <Plus size={14} /> Add Web Tab
            </Button>
          </div>
        )}

        {/* Tab: Global Sets */}
        {activeTab === 'global_sets' && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <ListFilter size={28} className="mx-auto text-slate-400 mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Global Picklist Sets</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Define reusable dropdown options across multiple modules (e.g. Blood Groups, Fee Categories, Accreditation Tiers).
            </p>
            <Button type="button" size="sm" className="mt-4 bg-blue-600 text-white" disabled>
              <Plus size={14} /> Add Global Set
            </Button>
          </div>
        )}
      </Card>

      {/* Modal: Create New Module */}
      <Dialog open={newModuleModalOpen} onOpenChange={setNewModuleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
            <DialogDescription>
              Create a custom data module (such as Hostel Management, Scholarships, or Mentorship) with dedicated layouts and fields.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="mod-plural">Module Name (Plural)</Label>
              <Input
                id="mod-plural"
                required
                placeholder="e.g. Scholarships / Hostels / Visitors"
                value={newModuleDraft.pluralLabel}
                onChange={(e) => setNewModuleDraft({ ...newModuleDraft, pluralLabel: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-singular">Singular Form</Label>
              <Input
                id="mod-singular"
                placeholder="e.g. Scholarship / Hostel / Visitor"
                value={newModuleDraft.singularLabel}
                onChange={(e) => setNewModuleDraft({ ...newModuleDraft, singularLabel: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-cat">Teamspace / Category</Label>
              <Select
                id="mod-cat"
                value={newModuleDraft.category}
                onChange={(e) => setNewModuleDraft({ ...newModuleDraft, category: e.target.value as ModuleItem['category'] })}
              >
                <option value="Academics">Academics</option>
                <option value="People & Roles">People & Roles</option>
                <option value="Career & Placement">Career & Placement</option>
                <option value="Administration">Administration</option>
                <option value="Operations">Operations</option>
              </Select>
              {moduleErrors.category ? <p className="text-xs text-rose-600">{moduleErrors.category}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mod-access">Who can use its records</Label>
              <Select
                id="mod-access"
                value={newModuleDraft.access}
                onChange={(e) => setNewModuleDraft({ ...newModuleDraft, access: e.target.value })}
              >
                {CUSTOM_MODULE_ACCESS_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-slate-500">Admins always have full access.</p>
            </div>

            {moduleErrors.key || moduleErrors.pluralLabel ? (
              <p className="text-xs text-rose-600">{moduleErrors.key ?? moduleErrors.pluralLabel}</p>
            ) : null}
            {moduleFormError ? (
              <Alert variant="destructive">
                <AlertDescription>{moduleFormError}</AlertDescription>
              </Alert>
            ) : null}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setNewModuleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleCreateModule}
              disabled={!newModuleDraft.pluralLabel.trim() || saveModule.isPending}
            >
              {saveModule.isPending ? 'Creating…' : 'Create Module'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
