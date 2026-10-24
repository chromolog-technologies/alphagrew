import { describe, expect, it } from 'vitest';
import { workspaceAccess } from './workspaceAccess';

describe('workspaceAccess', () => {
  const known = new Set(['dashboard', 'students', 'audit_log']);

  it('allows pages in the role menu', () => {
    expect(workspaceAccess('students', ['dashboard', 'students'], known)).toBe('allowed');
  });

  it('refuses pages that exist for other roles', () => {
    expect(workspaceAccess('audit_log', ['dashboard', 'students'], known)).toBe('forbidden');
  });

  it('reports unknown pages as not found', () => {
    expect(workspaceAccess('nope', ['dashboard'], known)).toBe('not_found');
  });
});
