import { useEffect, useState } from 'react';
import { getStoredToken } from '../api/apiClient';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || 'http://localhost:8000/api/v1');

function getTokenFromStorage(): string | null {
  return getStoredToken();
}


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
        const token = getTokenFromStorage();
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/permissions/all`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load permissions');
        }

        const data = await response.json();

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
