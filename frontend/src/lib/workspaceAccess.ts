/**
 * Route guard for workspace pages (/app/:tab): a page in the role's menu opens, a page
 * that exists for other roles is refused (403), anything else is not found (404).
 * The API still enforces permissions on every request; this only decides what to render.
 */
export type WorkspaceAccess = 'allowed' | 'forbidden' | 'not_found';

export function workspaceAccess(tab: string, allowedTabs: Iterable<string>, knownTabs: Set<string>): WorkspaceAccess {
  for (const allowed of allowedTabs) {
    if (allowed === tab) return 'allowed';
  }

  return knownTabs.has(tab) ? 'forbidden' : 'not_found';
}
