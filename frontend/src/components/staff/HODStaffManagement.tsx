import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { fetchAllStaffMembers, createNewStaffMember, deleteStaffMember, assignClassesToStaff } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';
import { PrototypeNotice } from '../shared';

interface StaffMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  specialization: string;
  qualifications: string;
  experience: number;
  joinDate: string;
  status: 'active' | 'inactive' | 'on_leave';
}

export const HODStaffManagement: React.FC = () => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const positions = ['Associate Professor', 'Assistant Professor', 'Lecturer'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getStoredAuthToken();

        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const response = await fetchAllStaffMembers(token);
        if (response?.data) {
          const staffList = Array.isArray(response.data) ? response.data : 
            response.data.staff || [];
          setStaffMembers(staffList);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch staff');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteStaff = async (id: number) => {
    try {
      const token = getStoredAuthToken();

      if (!token) return;
      
      await deleteStaffMember(token, id);

      setStaffMembers(staffMembers.filter((s) => s.id !== id));
    } catch (err) {
      alert('Error deleting staff: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on_leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  const filteredStaff = staffMembers.filter((staff) => {
    if (filterPosition !== 'all' && staff.position !== filterPosition) return false;
    if (filterStatus !== 'all' && staff.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading staff data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrototypeNotice />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Staff Management</h2>
          <p className="mt-1 text-sm text-slate-600">Manage department faculty and staff</p>
        </div>
        <button
          onClick={() => setIsAddingStaff(!isAddingStaff)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Staff Member
        </button>
      </div>

      {/* Add Staff Form */}
      {isAddingStaff && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-4">Add New Staff Member</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Full Name"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email Address"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Select Position</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Specialization"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Qualifications"
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            <button
              onClick={() => setIsAddingStaff(false)}
              className="px-4 py-2 bg-slate-300 text-slate-900 rounded-lg hover:bg-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Positions</option>
            {positions.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => (
          <div key={staff.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-lg">{staff.name}</h4>
                <p className="text-sm text-slate-600">{staff.position}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(staff.status)}`}>
                {getStatusLabel(staff.status)}
              </span>
            </div>

            <div className="space-y-2 mb-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                <span>{staff.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-blue-600" />
                <span>{staff.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600" />
                <span>{staff.specialization}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 text-xs border-t border-slate-200 pt-3">
              <div>
                <p className="text-slate-500">Qualifications</p>
                <p className="font-semibold text-slate-900">{staff.qualifications}</p>
              </div>
              <div>
                <p className="text-slate-500">Experience</p>
                <p className="font-semibold text-slate-900">{staff.experience} yrs</p>
              </div>
              <div>
                <p className="text-slate-500">Joined</p>
                <p className="font-semibold text-slate-900">{new Date(staff.joinDate).getFullYear()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm font-medium">
                <Edit2 size={16} />
                Edit
              </button>
              <button
                onClick={() => handleDeleteStaff(staff.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <p className="text-slate-600">No staff members found with selected filters</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-lg border border-slate-200">
        <div>
          <p className="text-sm text-slate-600 font-medium">Total Staff</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{staffMembers.length}</p>
        </div>
        <div>
          <p className="text-sm text-slate-600 font-medium">Active Members</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {staffMembers.filter((s) => s.status === 'active').length}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-600 font-medium">On Leave</p>
          <p className="text-3xl font-bold text-yellow-600 mt-1">
            {staffMembers.filter((s) => s.status === 'on_leave').length}
          </p>
        </div>
      </div>
    </div>
  );
};
