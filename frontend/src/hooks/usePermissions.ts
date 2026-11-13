import { useEffect, useState } from 'react';
import { apiFetch, getStoredToken, isApiConfigured } from '../api/core';


export interface UserPermissions {
  permissions: Record<string, Record<string, boolean>>;
  role: string;
  modules: string[];
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const token = getStoredToken();
        if (!isApiConfigured() || !token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const data = await apiFetch<{ permissions: UserPermissions['permissions']; role: string }>('/permissions/all', {
          token,
          fallbackMessage: 'Failed to load permissions',
        });

        setPermissions({
          permissions: data.permissions,
          role: data.role,
          modules: Object.keys(data.permissions),
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = (module: string, action: string): boolean => {
    if (!permissions) return false;
    return permissions.permissions[module]?.[action] ?? false;
  };

  const canAccess = (module: string): boolean => {
    return permissions?.modules?.includes(module) ?? false;
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    canAccess,
  };
};
