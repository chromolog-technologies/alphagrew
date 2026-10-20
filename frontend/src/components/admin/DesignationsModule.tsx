import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, ChevronDown, Shield, X } from 'lucide-react';
import { apiCall } from '../../api/apiClient';

interface Designation {
  id: number;
  name: string;
  slug: string;
  department_id?: number;
  department?: { id: number; name: string };
  description?: string;
  status: 'active' | 'inactive';
  permissions?: Permission[];
  permission_count?: number;
  created_at?: string;
}

interface Permission {
  id: number;
  name: string;
  module: string;
  description: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
}

interface FormData {
  name: string;
  slug: string;
  department_id: number | '';
  description: string;
  status: 'active' | 'inactive';
  permissions: number[];
}

interface PermissionModule {
  [key: string]: Permission[];
}

export const DesignationsModule: React.FC = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionModule>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectingPermissionsFor, setSelectingPermissionsFor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    permissions: true,
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    department_id: '',
    description: '',
    status: 'active',
    permissions: [],
  });

  useEffect(() => {
    loadDesignations();
    loadDepartments();
    loadPermissions();
  }, []);

  const loadDesignations = async () => {
    try {
      setLoading(true);
        const response = await apiCall('/designations', 'GET');
      if (response && response.data) {
        setDesignations(response.data);
      } else if (Array.isArray(response)) {
        setDesignations(response);
      }
      setError('');
    } catch (err) {
      setError('Failed to load designations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
        const response = await apiCall('/designations/list/departments', 'GET');
      if (Array.isArray(response)) {
        setDepartments(response);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await apiCall('/designations/list/permissions?group_by_module=1', 'GET');
      const groups: Array<{ module_name: string; permissions: Array<{ id: number; name: string }> }> =
        Array.isArray(response?.data) ? response.data : [];

      setAllPermissions(
        Object.fromEntries(
          groups.map((group) => [
            group.module_name,
            group.permissions.map((permission) => ({
              ...permission,
              module: group.module_name,
              description: '',
            })),
          ]),
        ),
      );
    } catch (err) {
      console.error('Failed to load permissions', err);
    }
  };

  const filteredDesignations = designations.filter(
    (des) =>
      des.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      des.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResetForm = () => {
    setFormData({
      name: '',
      slug: '',
      department_id: '',
      description: '',
      status: 'active',
      permissions: [],
    });
    setEditingId(null);
  };

  const handleAddDesignation = async () => {
    if (!formData.name || !formData.slug) {
      setError('Please fill in all required fields (Name, Slug)');
      return;
    }

    try {
      const payload = {
        ...formData,
        department_id: formData.department_id ? Number(formData.department_id) : null,
        permissions: formData.permissions,
      };

      if (editingId) {
          await apiCall(`/designations/${editingId}`, 'PUT', payload);
      } else {
          await apiCall('/designations', 'POST', payload);
      }

      await loadDesignations();
      handleResetForm();
      setShowForm(false);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to save designation');
    }
  };

  const handleEditDesignation = (designation: Designation) => {
    setFormData({
      name: designation.name,
      slug: designation.slug,
      department_id: designation.department_id || '',
      description: designation.description || '',
      status: designation.status,
      permissions: [],
    });
    setEditingId(designation.id);
    setShowForm(true);
    setExpandedSections({ basic: true, permissions: true });
  };

  const handleDeleteDesignation = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this designation?')) {
      try {
          await apiCall(`/designations/${id}`, 'DELETE');
        await loadDesignations();
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to delete designation');
      }
    }
  };

  const handlePermissionToggle = (permissionId: number) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const handleOpenPermissionModal = (designationId: number) => {
    setSelectingPermissionsFor(designationId);
    setShowPermissionModal(true);
    const designation = designations.find((d) => d.id === designationId);
    if (designation && designation.permissions) {
      setFormData((prev) => ({
        ...prev,
        permissions: designation.permissions?.map((p) => p.id) || [],
      }));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectingPermissionsFor) return;

    try {
      await apiCall(`/designations/${selectingPermissionsFor}/assign-permissions`, 'POST', {
        permission_ids: formData.permissions,
      });

      await loadDesignations();
      setShowPermissionModal(false);
      setSelectingPermissionsFor(null);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to assign permissions');
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Designations Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage roles and permissions</p>
        </div>
        <button
          onClick={() => {
            handleResetForm();
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Add Designation
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search designations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">{editingId ? 'Edit Designation' : 'Add New Designation'}</h3>

          {/* Basic Information Section */}
          <div className="mb-4 border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('basic')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
            >
              <span className="font-semibold text-slate-900">Basic Information</span>
              <ChevronDown size={18} className={expandedSections.basic ? 'rotate-180' : ''} />
            </button>
            {expandedSections.basic && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                <input
                  type="text"
                  placeholder="Designation Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Slug (URL-friendly) *"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) || '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Global Designation</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                handleResetForm();
                setShowForm(false);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDesignation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingId ? 'Update Designation' : 'Create Designation'}
            </button>
          </div>
        </div>
      )}

      {/* Designations Table */}
      {loading ? (
        <div className="text-center py-8 text-slate-600">Loading designations...</div>
      ) : filteredDesignations.length === 0 ? (
        <div className="text-center py-8 text-slate-600">No designations found</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Designation</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Scope</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-1">
                      <Shield size={16} />
                      Permissions
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDesignations.map((designation) => (
                  <tr key={designation.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{designation.name}</p>
                        {designation.description && <p className="text-xs text-slate-600">{designation.description.substring(0, 50)}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {designation.department ? (
                        <span className="inline-flex px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                          {designation.department.name}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        <Shield size={14} /> {designation.permission_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          designation.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {designation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenPermissionModal(designation.id)}
                          className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                          title="Assign Permissions"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => handleEditDesignation(designation)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDesignation(designation.id)}
                          className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permission Assignment Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Assign Permissions</h3>
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setSelectingPermissionsFor(null);
                }}
                className="p-1 hover:bg-slate-200 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {Object.entries(allPermissions).map(([module, permissions]) => (
                <div key={module} className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3 capitalize">{module}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => (
                      <label key={permission.id} className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{permission.name.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-600">{permission.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 flex gap-3 justify-end p-6 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setSelectingPermissionsFor(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
