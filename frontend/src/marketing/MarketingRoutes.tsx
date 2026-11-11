import { lazy, type ComponentType } from 'react';
import { Route } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import { SITE_PAGES, type SitePageId } from './siteMap';

type PageComponent = ComponentType & { preload?: () => Promise<unknown> };

/**
 * A page split into its own chunk. Once its code has loaded it renders synchronously (no
 * Suspense flash on later visits, and tests can preload every page first); before that it
 * renders through React.lazy inside SiteLayout's Suspense boundary.
 */
function lazyPage(load: () => Promise<{ default: ComponentType }>): PageComponent {
  let Loaded: ComponentType | null = null;
  const preload = () =>
    load().then((module) => {
      Loaded = module.default;
      return module;
    });
  const Lazy = lazy(preload);
  const Page: PageComponent = () => (Loaded ? <Loaded /> : <Lazy />);
  Page.preload = preload;
  return Page;
}

const solutionRole = (role: 'institutions' | 'placement-officers' | 'faculty' | 'students' | 'recruiters') =>
  lazyPage(() =>
    import('./pages/SolutionRolePage').then(({ default: SolutionRolePage }) => ({
      default: () => <SolutionRolePage role={role} />,
    })),
  );

/** The home page and the 404 ship with the first load; every other page is its own chunk. */
const PAGES: Record<SitePageId, PageComponent> = {
  home: HomePage,
  about: lazyPage(() => import('./pages/AboutPage')),
  platform: lazyPage(() => import('./pages/PlatformPage')),
  aiInterviewer: lazyPage(() => import('./pages/AiInterviewerPage')),
  careerIntelligence: lazyPage(() => import('./pages/CareerIntelligencePage')),
  placementManagement: lazyPage(() => import('./pages/PlacementManagementPage')),
  solutions: lazyPage(() => import('./pages/SolutionsPage')),
  solutionInstitutions: solutionRole('institutions'),
  solutionPlacementOfficers: solutionRole('placement-officers'),
  solutionFaculty: solutionRole('faculty'),
  solutionStudents: solutionRole('students'),
  solutionRecruiters: solutionRole('recruiters'),
  howItWorks: lazyPage(() => import('./pages/HowItWorksPage')),
  faq: lazyPage(() => import('./pages/FaqPage')),
  contact: lazyPage(() => import('./pages/ContactPage')),
  privacy: lazyPage(() => import('./pages/LegalPages').then((module) => ({ default: module.PrivacyPage }))),
  terms: lazyPage(() => import('./pages/LegalPages').then((module) => ({ default: module.TermsPage }))),
};

/** Loads every page's code, e.g. when the browser is idle after the first page, or in tests. */
export function preloadMarketingPages(): Promise<unknown> {
  return Promise.all(Object.values(PAGES).map((page) => page.preload?.()));
}

/**
 * The public site's routes, wrapped in the shared shell. Rendered inside Root's <Routes>
 * (a function returning <Route> elements, as React Router requires). The catch-all 404
 * lives here so unknown public URLs keep the site header and footer.
 */
export function marketingRoutes() {
  return (
    <Route element={<SiteLayout preload={preloadMarketingPages} />}>
      {(Object.keys(PAGES) as SitePageId[]).map((id) => {
        const Page = PAGES[id];
        const { path } = SITE_PAGES[id];
        return path === '/' ? <Route key={id} index element={<Page />} /> : <Route key={id} path={path} element={<Page />} />;
      })}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  );
}
