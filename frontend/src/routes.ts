// Sign-in and the signed-in app use these top-level paths; every other path is the public marketing site.
export const LOGIN_BASE_PATH = '/login';

/** Account pages such as /forgot-password and /register sit at the top level; no argument gives the sign-in page. */
export const loginPath = (page = '') => (page ? `/${page}` : LOGIN_BASE_PATH);

export const workspacePath = (tab: string) => `/app/${tab}`;

/** Route patterns handled by the signed-in app (App.tsx), including the Owner Console. */
export const APP_ROUTE_PATTERNS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/register',
  '/invitations/accept',
  '/app/*',
  '/owner/*',
] as const;
