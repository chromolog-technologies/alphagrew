import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import {
  LayoutDashboard,
  Activity,
  Database,
  Users,
  GraduationCap,
  ClipboardList,
  Calendar,
  BookOpen,
  Clock,
  PieChart,
  Building2,
  Briefcase,
  Send,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
} from 'lucide-react';

const MODULES = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    color: 'bg-blue-500',
    path: '/dashboard',
  },
  {
    id: 'activity',
    name: 'Activity Logs',
    icon: Activity,
    color: 'bg-green-500',
    path: '/activity',
  },
  {
    id: 'master',
    name: 'Master Data',
    icon: Database,
    color: 'bg-purple-500',
    path: '/master',
  },
  {
    id: 'departments',
    name: 'Departments',
    icon: Building2,
    color: 'bg-red-500',
    path: '/departments',
  },
  {
    id: 'designations',
    name: 'Designations',
    icon: Briefcase,
    color: 'bg-orange-500',
    path: '/designations',
  },
  {
    id: 'courses',
    name: 'Courses',
    icon: BookOpen,
    color: 'bg-indigo-500',
    path: '/courses',
  },
  {
    id: 'subjects',
    name: 'Subjects',
    icon: BookOpen,
    color: 'bg-yellow-500',
    path: '/subjects',
  },
  {
    id: 'academic_years',
    name: 'Academic Years',
    icon: Calendar,
    color: 'bg-cyan-500',
    path: '/academic-years',
  },
  {
    id: 'students',
    name: 'Students',
    icon: GraduationCap,
    color: 'bg-pink-500',
    path: '/students',
  },
  {
    id: 'staff',
    name: 'Staff',
    icon: Users,
    color: 'bg-teal-500',
    path: '/staff',
  },
  {
    id: 'users',
    name: 'Users',
    icon: Users,
    color: 'bg-slate-500',
    path: '/users',
  },
  {
    id: 'roles',
    name: 'Roles & Permissions',
    icon: Settings,
    color: 'bg-gray-600',
    path: '/roles',
  },
  {
    id: 'attendance',
    name: 'Attendance',
    icon: Clock,
    color: 'bg-lime-500',
    path: '/attendance',
  },
  {
    id: 'exams',
    name: 'Exams',
    icon: ClipboardList,
    color: 'bg-amber-500',
    path: '/exams',
  },
  {
    id: 'marks',
    name: 'Marks',
    icon: PieChart,
    color: 'bg-emerald-500',
    path: '/marks',
  },
  {
    id: 'timetable',
    name: 'Timetable',
    icon: Calendar,
    color: 'bg-violet-500',
    path: '/timetable',
  },
  {
    id: 'classes',
    name: 'Classes',
    icon: Users,
    color: 'bg-rose-500',
    path: '/classes',
  },
  {
    id: 'companies',
    name: 'Companies',
    icon: Building2,
    color: 'bg-blue-600',
    path: '/companies',
  },
  {
    id: 'job_drives',
    name: 'Job Drives',
    icon: Briefcase,
    color: 'bg-green-600',
    path: '/job-drives',
  },
  {
    id: 'placement',
    name: 'Placement',
    icon: Send,
    color: 'bg-red-600',
    path: '/placement',
  },
  {
    id: 'announcements',
    name: 'Announcements',
    icon: Send,
    color: 'bg-yellow-600',
    path: '/announcements',
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: BarChart3,
    color: 'bg-purple-600',
    path: '/reports',
  },
  {
    id: 'profile',
    name: 'Profile',
    icon: Users,
    color: 'bg-indigo-600',
    path: '/profile',
  },
  {
    id: 'settings',
    name: 'Settings',
    icon: Settings,
    color: 'bg-gray-700',
    path: '/settings',
  },
];

interface SidebarProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

export const RoleBasedSidebar: React.FC<SidebarProps> = ({
  currentPath = '/',
  onNavigate,
  onLogout,
}) => {
  const { permissions, loading, canAccess } = usePermissions();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['core']));

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="w-64 bg-slate-800 text-white p-6 flex items-center justify-center h-screen">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  // Group modules by category
  const groupedModules = {
    core: MODULES.filter((m) =>
      ['dashboard', 'activity', 'profile', 'settings'].includes(m.id)
    ),
    master: MODULES.filter((m) =>
      ['master', 'departments', 'designations'].includes(m.id)
    ),
    academic: MODULES.filter((m) =>
      [
        'courses',
        'subjects',
        'academic_years',
        'timetable',
        'classes',
      ].includes(m.id)
    ),
    users: MODULES.filter((m) =>
      ['students', 'staff', 'users', 'roles'].includes(m.id)
    ),
    exams: MODULES.filter((m) =>
      ['exams', 'marks', 'attendance'].includes(m.id)
    ),
    placement: MODULES.filter((m) =>
      [
        'companies',
        'job_drives',
        'placement',
        'announcements',
      ].includes(m.id)
    ),
    reports: MODULES.filter((m) => ['reports'].includes(m.id)),
  };

  const GroupLabel: Record<string, string> = {
    core: 'Core',
    master: 'Master Data',
    academic: 'Academic',
    users: 'Users & Roles',
    exams: 'Exams & Attendance',
    placement: 'Placement & Recruitment',
    reports: 'Reports & Analytics',
  };

  const accessibleModules = MODULES.filter((m) => canAccess(m.id));

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } bg-slate-800 text-white transition-all duration-300 min-h-screen overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div
            className={`flex items-center gap-2 ${isOpen ? '' : 'justify-center w-full'}`}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap size={20} className="text-white" />
            </div>
            {isOpen && (
              <div>
                <h1 className="font-bold text-white">AlphaGrew</h1>
                <p className="text-xs text-slate-400">Campus Management</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Modules List */}
        <nav className="p-4 space-y-2">
          {isOpen ? (
            // Expanded view with groups
            Object.entries(groupedModules).map(([groupKey, modules]) => {
              const visibleModules = modules.filter((m) => canAccess(m.id));
              if (visibleModules.length === 0) return null;

              return (
                <div key={groupKey} className="mb-4">
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
                  >
                    {GroupLabel[groupKey]}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${
                        expandedGroups.has(groupKey) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedGroups.has(groupKey) && (
                    <div className="space-y-1 ml-2">
                      {visibleModules.map((module) => {
                        const Icon = module.icon;
                        const isActive = currentPath === module.path;

                        return (
                          <button
                            key={module.id}
                            onClick={() => onNavigate?.(module.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                              isActive
                                ? `${module.color} text-white shadow-lg`
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <Icon size={18} />
                            <span>{module.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Collapsed view - icons only
            accessibleModules.map((module) => {
              const Icon = module.icon;
              const isActive = currentPath === module.path;

              return (
                <button
                  key={module.id}
                  onClick={() => onNavigate?.(module.path)}
                  className={`w-full flex items-center justify-center p-2 rounded-lg transition-all group relative ${
                    isActive
                      ? `${module.color} text-white shadow-lg`
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={module.name}
                >
                  <Icon size={20} />
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {module.name}
                  </div>
                </button>
              );
            })
          )}
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-slate-700 bg-slate-900">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {!isOpen && (
        <div className="hidden md:block flex-1 bg-slate-50">
          {/* Content area placeholder */}
        </div>
      )}
    </div>
  );
};

export default RoleBasedSidebar;
