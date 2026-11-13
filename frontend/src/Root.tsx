import { lazy, Suspense } from 'react';
import { matchPath, Routes, useLocation } from 'react-router-dom';
import { PageLoading } from './components/shared/RouteStatus';
import { usePageMeta } from './marketing/components/PageMeta';
import { BRAND } from './marketing/config';
import { marketingRoutes } from './marketing/MarketingRoutes';
import { APP_ROUTE_PATTERNS } from './routes';

// The signed-in app is loaded on demand, so visitors to the public site never download it.
const App = lazy(() => import('./App'));

/** Sign-in and workspace pages are not for search engines; also clears the last public page's title. */
function SignedInApp() {
  usePageMeta({ title: BRAND, noindex: true });
  return (
    <Suspense fallback={<PageLoading />}>
      <App />
    </Suspense>
  );
}

/** True when the path belongs to the app (sign-in, workspace, Owner Console) rather than the marketing site. */
export function isAppPath(pathname: string) {
  return APP_ROUTE_PATTERNS.some((pattern) => matchPath(pattern, pathname) !== null);
}

/**
 * Sign-in, the workspace and the Owner Console go to the app; every other path is the marketing site.
 * The app is rendered outside a parent <Route> on purpose: its own route table uses absolute paths
 * (/owner/login, /app/:tab), which React Router would otherwise resolve relative to the parent match.
 */
export default function Root() {
  const { pathname } = useLocation();
  if (isAppPath(pathname)) return <SignedInApp />;
  return <Routes>{marketingRoutes()}</Routes>;
}
