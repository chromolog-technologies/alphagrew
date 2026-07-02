import React, { useState } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { AttendanceMarkForm } from './AttendanceMarkForm';
import { AttendanceReport } from './AttendanceReport';
import { Users, BarChart3 } from 'lucide-react';

interface AttendanceModuleProps {
  userRole?: string;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({ userRole }) => {
  const { hasPermission, canAccess, loading } = usePermissions();
  const [activeTab, setActiveTab] = useState<'mark' | 'report'>('mark');
  const [refreshKey, setRefreshKey] = useState(0);

  if (loading) {
    return <div className="text-center py-8">Loading permissions...</div>;
  }

  if (!canAccess('attendance')) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">You don't have permission to access the Attendance module.</p>
      </div>
    );
  }

  return (
    <ProtectedRoute module="attendance">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-8 mb-6">
          <h1 className="text-3xl font-bold mb-2">Attendance Management</h1>
          <p className="text-blue-100">
            Track student attendance and generate comprehensive reports
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-lg shadow-md p-2">
          {hasPermission('attendance', 'mark') && (
            <button
              onClick={() => setActiveTab('mark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'mark'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Users size={18} />
              Mark Attendance
            </button>
          )}

          {hasPermission('attendance', 'view') && (
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'report'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 size={18} />
              View Reports
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Mark Attendance Tab */}
          {activeTab === 'mark' && hasPermission('attendance', 'mark') && (
            <ProtectedRoute module="attendance" action="mark">
              <div key={refreshKey}>
                <AttendanceMarkForm onSuccess={() => setRefreshKey((k) => k + 1)} />
              </div>
            </ProtectedRoute>
          )}

          {/* View Reports Tab */}
          {activeTab === 'report' && hasPermission('attendance', 'view') && (
            <ProtectedRoute module="attendance" action="view">
              <AttendanceReport />
            </ProtectedRoute>
          )}

          {/* No Permission Message */}
          {activeTab === 'mark' && !hasPermission('attendance', 'mark') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">
                You don't have permission to mark attendance.
              </p>
            </div>
          )}

          {activeTab === 'report' && !hasPermission('attendance', 'view') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800">
                You don't have permission to view attendance reports.
              </p>
            </div>
          )}
        </div>

        {/* Permission Summary */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4">Your Permissions</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { key: 'mark', label: 'Mark Attendance', icon: '✓' },
              { key: 'view', label: 'View Attendance', icon: '✓' },
              { key: 'approve', label: 'Approve Attendance', icon: '✓' },
              { key: 'edit', label: 'Edit Records', icon: '✓' },
              { key: 'delete', label: 'Delete Records', icon: '✓' },
            ].map((perm) => (
              <div
                key={perm.key}
                className={`p-3 rounded-lg text-center ${
                  hasPermission('attendance', perm.key as any)
                    ? 'bg-green-100 border border-green-300'
                    : 'bg-gray-100 border border-gray-300 opacity-50'
                }`}
              >
                <div className="text-lg font-bold mb-1">
                  {hasPermission('attendance', perm.key as any) ? '✓' : '✗'}
                </div>
                <div className="text-xs font-medium text-gray-700">{perm.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AttendanceModule;
