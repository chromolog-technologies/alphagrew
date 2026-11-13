import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertCircle, ChevronDown, Users, UserPlus } from 'lucide-react';
import { apiCall } from '../../api/apiClient';
import { useRecordCustomFields } from '../../hooks/useRecordCustomFields';
import { CustomFieldInputs } from '../shared/CustomFieldInputs';
import Select from 'react-select';

interface DepartmentsModuleProps {
  onNavigateToStaff?: () => void;
}

interface Department {
  id: number;
  name: string;
  code: string;
  hod_id?: number;
  hod?: { id: number; name: string; email: string };
  description?: string;
  contact_email?: string;
  phone?: string;
  intake_capacity?: number;
  staff_count?: number;
  status: 'active' | 'inactive';
  created_at?: string;
}

interface HODOption {
  id: number;
  name: string;
  email: string;
}

interface HODSelectOption {
  value: number;
  label: string;
}

interface FormData {
  name: string;
  code: string;
  hod_id: number | '';
  description: string;
  contact_email: string;
  phone: string;
  intake_capacity: number | '';
  status: 'active' | 'inactive';
}

export const DepartmentsModule: React.FC<DepartmentsModuleProps> = ({ onNavigateToStaff }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hodOptions, setHodOptions] = useState<HODOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const customFields = useRecordCustomFields('department', editingId, showForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    contact: false,
    admin: false,
  });

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    hod_id: '',
    description: '',
    contact_email: '',
    phone: '',
    intake_capacity: '',
    status: 'active',
  });

  const hodSelectOptions: HODSelectOption[] = hodOptions.map((hod) => ({
    value: hod.id,
    label: `${hod.name}${hod.email ? ` (${hod.email})` : ''}`,
  }));

  useEffect(() => {
    loadDepartments();
    loadHodOptions();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
        const response = await apiCall('/departments', 'GET');
      if (response && response.data) {
        setDepartments(response.data);
      } else if (Array.isArray(response)) {
        setDepartments(response);
      }
      setError('');
    } catch (err) {
      setError('Failed to load departments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadHodOptions = async () => {
    try {
        const response = await apiCall('/departments/list/hod-options', 'GET');
      const data = response?.data ?? response;
      if (Array.isArray(data)) {
        setHodOptions(data);
      }
    } catch (err) {
      console.error('Failed to load HOD options', err);
    }
  };

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleResetForm = () => {
    setFormData({
      name: '',
      code: '',
      hod_id: '',
      description: '',
      contact_email: '',
      phone: '',
      intake_capacity: '',
      status: 'active',
    });
    setEditingId(null);
  };

  const handleAddDepartment = async () => {
    if (!formData.name || !formData.code) {
      setError('Please fill in all required fields (Name, Code)');
      return;
    }

    try {
      const payload = {
        ...formData,
        hod_id: formData.hod_id ? Number(formData.hod_id) : null,
        intake_capacity: formData.intake_capacity ? Number(formData.intake_capacity) : null,
        ...customFields.payload(),
      };

      if (editingId) {
          await apiCall(`/departments/${editingId}`, 'PUT', payload);
      } else {
          await apiCall('/departments', 'POST', payload);
      }

      await loadDepartments();
      handleResetForm();
      setShowForm(false);
      setError('');
    } catch (err: any) {
      customFields.captureErrors(err);
      setError(err.message || 'Failed to save department');
    }
  };

  const handleEditDepartment = (dept: Department) => {
    setFormData({
      name: dept.name,
      code: dept.code,
      hod_id: dept.hod_id || '',
      description: dept.description || '',
      contact_email: dept.contact_email || '',
      phone: dept.phone || '',
      intake_capacity: dept.intake_capacity || '',
      status: dept.status,
    });
    setEditingId(dept.id);
    setShowForm(true);
    setExpandedSections({ basic: true, contact: false, admin: false });
  };

  const handleDeleteDepartment = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
          await apiCall(`/departments/${id}`, 'DELETE');
        await loadDepartments();
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to delete department');
      }
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
          <h2 className="text-2xl font-bold text-slate-900">Departments Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage academic departments and heads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onNavigateToStaff?.();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            <UserPlus size={18} /> Add Staff
          </button>
          <button
            type="button"
            onClick={() => {
              handleResetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Plus size={18} /> Add Department
          </button>
        </div>
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
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-6">{editingId ? 'Edit Department' : 'Add New Department'}</h3>

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
                  placeholder="Department Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Department Code *"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    placeholder="Enter department description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Department Email</label>
                  <input
                    type="email"
                    placeholder="dept@college.edu"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Department Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Staff and Status Section */}
          <div className="mb-4 border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('contact')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
            >
              <span className="font-semibold text-slate-900">Staff and Capacity</span>
              <ChevronDown size={18} className={expandedSections.contact ? 'rotate-180' : ''} />
            </button>
            {expandedSections.contact && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">HOD</label>
                  <Select
                    options={hodSelectOptions}
                    value={hodSelectOptions.find((option) => option.value === formData.hod_id) ?? null}
                    onChange={(selected) =>
                      setFormData({
                        ...formData,
                        hod_id: selected ? selected.value : '',
                      })
                    }
                    placeholder="Search and select Head of Department"
                    isClearable
                    isSearchable
                    className="text-sm"
                    classNamePrefix="department-hod"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">Staff Count</label>
                  <input
                    type="number"
                    value={editingId ? departments.find((d) => d.id === editingId)?.staff_count ?? 0 : 0}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-slate-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Administrative Section */}
          <div className="mb-4 border border-slate-200 rounded-lg">
            <button
              onClick={() => toggleSection('admin')}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-t-lg"
            >
              <span className="font-semibold text-slate-900">Administrative</span>
              <ChevronDown size={18} className={expandedSections.admin ? 'rotate-180' : ''} />
            </button>
            {expandedSections.admin && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200">
                <input
                  type="number"
                  placeholder="Intake Capacity"
                  value={formData.intake_capacity}
                  onChange={(e) => setFormData({ ...formData, intake_capacity: e.target.value ? Number(e.target.value) : '' })}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          <CustomFieldInputs
            definitions={customFields.fields}
            values={customFields.values}
            onChange={customFields.setValues}
            errors={customFields.errors}
            className="mb-6 grid gap-4 md:grid-cols-2"
          />

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
              onClick={handleAddDepartment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingId ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </div>
      )}

      {/* Departments Table */}
      {loading ? (
        <div className="text-center py-8 text-slate-600">Loading departments...</div>
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-8 text-slate-600">No departments found</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Contact</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Head of Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      Staff
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Status</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{dept.name}</p>
                        {dept.description && <p className="text-xs text-slate-600">{dept.description.substring(0, 50)}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{dept.code}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>
                        {dept.contact_email && <p>{dept.contact_email}</p>}
                        {dept.phone && <p className="text-xs">{dept.phone}</p>}
                        {!dept.contact_email && !dept.phone && <span className="text-slate-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {dept.hod ? (
                        <div>
                          <p className="font-medium">{dept.hod.name}</p>
                          <p className="text-xs">{dept.hod.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        <Users size={14} /> {dept.staff_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          dept.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {dept.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditDepartment(dept)}
                          className="p-2 hover:bg-blue-100 rounded-lg text-blue-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept.id)}
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
    </div>
  );
};
