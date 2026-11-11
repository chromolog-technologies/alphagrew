/**
 * Owner console shell (Owner Dashboard SRS release 1) for Super Admins and platform staff.
 * Pages live at /owner/<section>/<id?>; the sidebar shows only what the person's platform
 * role allows (the server checks the same permissions on every request).
 */
import { Suspense, useMemo, useState, type ComponentType } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  Bot,
  Building2,
  CreditCard,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Repeat,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { lazyNamed } from '@/lib/lazyNamed';
import { campusRoleLabels, type CampusSession } from '../../campusTypes';
import { OWNER } from '../../api/ownerApi';
import { PageLoading } from '../shared/RouteStatus';

const OwnerOverview = lazyNamed(() => import('./OwnerOverview'), 'OwnerOverview');
const InstitutionsPage = lazyNamed(() => import('./InstitutionsPage'), 'InstitutionsPage');
const UsersPage = lazyNamed(() => import('./UsersPage'), 'UsersPage');
const PlansPage = lazyNamed(() => import('./PlansPage'), 'PlansPage');
const SubscriptionsPage = lazyNamed(() => import('./SubscriptionsPage'), 'SubscriptionsPage');
const BillingPage = lazyNamed(() => import('./BillingPage'), 'BillingPage');
const AiCreditsPage = lazyNamed(() => import('./AiCreditsPage'), 'AiCreditsPage');
const SettingsPage = lazyNamed(() => import('./SettingsPage'), 'SettingsPage');
const SecurityPage = lazyNamed(() => import('./SecurityPage'), 'SecurityPage');
const SystemHealthPage = lazyNamed(() => import('./SystemHealthPage'), 'SystemHealthPage');
const AccountPage = lazyNamed(() => import('./AccountPage'), 'AccountPage');

interface Section {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  /** Any one of these opens the section; none means everyone. */
  anyOf: string[];
  page: ComponentType<OwnerPageProps>;
}

export interface OwnerPageProps {
  user: CampusSession;
  can: (permission: string) => boolean;
  /** The id segment of the URL, e.g. /owner/institutions/4. */
  id?: number;
  go: (path: string) => void;
}

/** Single unified Owner Console workspace (no per-role dashboard split). */
const GROUPS: { label: string; sections: Section[] }[] = [
  {
    label: 'Platform',
    sections: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, anyOf: [OWNER.dashboard], page: OwnerOverview },
      { id: 'institutions', label: 'Institutions', icon: Building2, anyOf: [OWNER.institutionsView], page: InstitutionsPage },
      { id: 'users', label: 'Users', icon: Users, anyOf: [OWNER.usersView], page: UsersPage },
    ],
  },
  {
    label: 'SaaS & Revenue',
    sections: [
      { id: 'plans', label: 'Plans & pricing', icon: Layers, anyOf: [OWNER.plansView], page: PlansPage },
      { id: 'subscriptions', label: 'Subscriptions', icon: Repeat, anyOf: [OWNER.subscriptionsView], page: SubscriptionsPage },
      { id: 'billing', label: 'Billing & revenue', icon: CreditCard, anyOf: [OWNER.billingView], page: BillingPage },
    ],
  },
  {
    label: 'AI & Intelligence',
    sections: [
      { id: 'ai', label: 'AI & credits', icon: Bot, anyOf: [OWNER.aiView], page: AiCreditsPage },
    ],
  },
  {
    label: 'Administration',
    sections: [
      { id: 'settings', label: 'Global settings', icon: Settings, anyOf: [OWNER.settingsView], page: SettingsPage },
    ],
  },
  {
    label: 'Security & system',
    sections: [
      { id: 'security', label: 'Audit & security', icon: ScrollText, anyOf: [OWNER.auditView, OWNER.securityView], page: SecurityPage },
      { id: 'system', label: 'System health', icon: Activity, anyOf: [OWNER.systemView], page: SystemHealthPage },
      { id: 'account', label: 'My account', icon: KeyRound, anyOf: [], page: AccountPage },
    ],
  },
];

export default function OwnerWorkspace({ user, onLogout }: { user: CampusSession; onLogout: () => void }) {
  const { section: sectionId, id } = useParams();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const permissions = useMemo(() => new Set(user.ownerPermissions ?? []), [user.ownerPermissions]);
  const isOwner = user.role === 'super_admin';
  const can = (permission: string) => isOwner || permissions.has(permission);
  const groups = isOwner
    ? GROUPS
    : GROUPS.map((group) => ({
        ...group,
        sections: group.sections.filter((section) => section.anyOf.length === 0 || section.anyOf.some((permission) => permissions.has(permission))),
      })).filter((group) => group.sections.length > 0);
  const visible = groups.flatMap((group) => group.sections);
  const current = visible.find((section) => section.id === sectionId);

  if (!current) {
    return <Navigate to={`/owner/${visible[0]?.id ?? 'account'}`} replace />;
  }

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(`/owner/${path}`);
  };
  const Page = current.page;
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      {menuOpen ? <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" /> : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-63 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Owner console navigation"
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary p-1 shadow-card">
            <img src="/alpha-logo.png" alt="" className="h-7 w-7 object-contain" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold tracking-tight text-foreground">Alpha Grew</span>
            <span className="block truncate text-2xs text-muted-foreground">Owner console</span>
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
              <div className="space-y-0.5">
                {group.sections.map((section) => {
                  const active = section.id === current.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => go(section.id)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md px-3 py-1.75 text-left text-[13px] font-medium transition-colors',
                        active ? 'bg-primary/8 text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
                      )}
                    >
                      <section.icon size={16} className="shrink-0" />
                      <span className="flex-1 truncate">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
              <span className="block truncate text-2xs text-muted-foreground">
                {user.role === 'super_admin' ? 'Platform Owner' : user.platformRole ?? campusRoleLabels[user.role]}
              </span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/80 bg-card/95 px-4 backdrop-blur lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={18} />
          </Button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <span>Owner console</span>
            <span aria-hidden="true">/</span>
            <button type="button" className={cn('truncate', id ? 'hover:text-foreground' : 'font-medium text-foreground')} onClick={() => go(current.id)}>
              {current.label}
            </button>
            {id ? (
              <>
                <span aria-hidden="true">/</span>
                <span className="font-medium text-foreground">#{id}</span>
              </>
            ) : null}
          </nav>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-foreground px-2.5 py-1 text-2xs font-semibold text-white sm:inline-flex">
            <ShieldCheck size={12} /> {user.role === 'super_admin' ? 'Platform Owner' : campusRoleLabels[user.role]}
          </span>
        </header>

        <main className="space-y-5 p-4 lg:p-6">
          <Suspense fallback={<PageLoading />}>
            <Page key={`${current.id}-${id ?? ''}`} user={user} can={can} id={id ? Number(id) : undefined} go={go} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
