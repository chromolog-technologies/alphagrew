import React, { useState, useEffect } from 'react';
import { Plus, Lock, Users, Edit2, Trash2, Check, X, Loader } from 'lucide-react';
import { apiCall } from '../../api/apiClient';

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: number[];
  userCount: number;
  createdAt: string;
}

export const RolesPermissionsModule: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([
    {
      id: 1,
      name: 'Admin',
      description: 'Full system access',
      permissions: [1, 2, 3, 4, 5, 6, 7, 8],
      userCount: 2,
      createdAt: '2026-01-01',
    },
    {
      id: 2,
      name: 'Faculty',
      description: 'Can manage attendance and classes',
      permissions: [1, 3, 5],
      userCount: 15,
      createdAt: '2026-01-05',
    },
    {
      id: 3,
      name: 'Student',
      description: 'Can view own data',
      permissions: [1, 7],
      userCount: 500,
      createdAt: '2026-01-10',
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);
        const res = await apiCall('/permissions/roles/all', 'GET');
        if (res?.roles && Array.isArray(res.roles) && res.roles.length > 0) {
          setRoles(res.roles.map((r: any, idx: number) => ({
            id: r.id || idx + 1,
            name: r.name ? r.name.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Role',
            description: `${r.permissions_count || 0} permissions assigned`,
            permissions: Array.isArray(r.permissions) ? r.permissions.map((_: any, pIdx: number) => pIdx + 1) : [1],
            userCount: r.users_count || 0,
            createdAt: '2026-01-01',
          })));
        }
      } catch (err) {
        console.warn('Could not load real roles from API, using fallback:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const [permissions] = useState<Permission[]>([
    { id: 1, name: 'dashboard.view', description: 'View Dashboard', module: 'Dashboard' },
    { id: 2, name: 'users.manage', description: 'Manage Users', module: 'Users' },
    { id: 3, name: 'attendance.manage', description: 'Manage Attendance', module: 'Attendance' },
    { id: 4, name: 'exams.manage', description: 'Manage Exams', module: 'Exams' },
    { id: 5, name: 'classes.manage', description: 'Manage Classes', module: 'Academic' },
    { id: 6, name: 'reports.view', description: 'View Reports', module: 'Reports' },
    { id: 7, name: 'profile.view', description: 'View Own Profile', module: 'Profile' },
    { id: 8, name: 'system.config', description: 'Configure System', module: 'System' },
  ]);

  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as number[] });

  const handleAddRole = () => {
    if (formData.name) {
      setRoles([
        ...roles,
        {
          id: roles.length + 1,
          ...formData,
          userCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
        },
      ]);
      setFormData({ name: '', description: '', permissions: [] });
      setShowRoleForm(false);
    }
  };

  const togglePermission = (permId: number) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Roles & Permissions</h2>
          <p className="mt-1 text-sm text-slate-600">Manage system roles and access control</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 border-b-2 font-semibold transition ${
            activeTab === 'roles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={16} className="inline mr-2" /> Roles
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 border-b-2 font-semibold transition ${
            activeTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock size={16} className="inline mr-2" /> Permissions
        </button>
      </div>

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          <button
            onClick={() => {
              setSelectedRole(null);
              setFormData({ name: '', description: '', permissions: [] });
              setShowRoleForm(!showRoleForm);
            }}
            className="mb-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus size={18} /> Add Role
          </button>

          {showRoleForm && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Role</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Role Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Assign Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <div>
                          <p className="font-medium text-slate-900">{perm.name}</p>
                          <p className="text-xs text-slate-600">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleAddRole} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Save
                </button>
                <button onClick={() => setShowRoleForm(false)} className="bg-slate-300 text-slate-900 px-4 py-2 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{role.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{role.description}</p>
                  </div>
                  <Lock size={20} className="text-blue-600" />
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-semibold">{role.userCount}</span> Users
                  </p>
                  <p className="text-xs text-slate-500">{role.permissions.length} Permissions</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 text-blue-600 hover:text-blue-700 px-2 py-2 border border-blue-200 rounded hover:bg-blue-50">
                    <Edit2 size={16} className="mx-auto" />
                  </button>
                  <button className="flex-1 text-red-600 hover:text-red-700 px-2 py-2 border border-red-200 rounded hover:bg-red-50">
                    <Trash2 size={16} className="mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Permission</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Description</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-mono text-slate-900">{perm.name}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{perm.description}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {perm.module}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
