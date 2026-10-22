import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { fetchStaffWorkload, fetchDepartmentOverview, fetchPlacementStatistics } from '../../api/campusApi';
import { getStoredAuthToken } from '../../utils/auth';

interface StaffDashboardProps {
  staffRole: 'faculty' | 'hod' | 'placement' | 'exam_coordinator' | 'admin';
  staffName: string;
  staffDepartment?: string;
}

interface DashboardMetric {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ staffRole, staffName, staffDepartment }) => {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getStoredAuthToken();
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const metricsData = getFacultyMetrics(); // Default to faculty
        if (staffRole === 'hod') {
          const getHODData = getHODMetrics();
          setMetrics(getHODData);
        } else if (staffRole === 'placement') {
          const getPlacementData = getPlacementMetrics();
          setMetrics(getPlacementData);
        } else {
          setMetrics(metricsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [staffRole]);

  // Role-specific metrics
  const getFacultyMetrics = (): DashboardMetric[] => [
    {
      label: 'Classes This Week',
      value: 12,
      icon: <Users size={24} />,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Pending Attendance',
      value: 3,
      icon: <AlertCircle size={24} />,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Marks Entered',
      value: 156,
      icon: <TrendingUp size={24} />,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Average Student Score',
      value: '82.5%',
      icon: <BarChart3 size={24} />,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const getHODMetrics = (): DashboardMetric[] => [
    {
      label: 'Department Staff',
      value: 24,
      icon: <Users size={24} />,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Department Students',
      value: 480,
      icon: <Users size={24} />,
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      label: 'Average Department CGPA',
      value: '7.8/10',
      icon: <TrendingUp size={24} />,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Pending Approvals',
      value: 5,
      icon: <AlertCircle size={24} />,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  const getPlacementMetrics = (): DashboardMetric[] => [
    {
      label: 'Companies Registered',
      value: 18,
      icon: <Users size={24} />,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Job Openings',
      value: 42,
      icon: <TrendingUp size={24} />,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Students Placed',
      value: 156,
      icon: <Users size={24} />,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Pending Interviews',
      value: 28,
      icon: <AlertCircle size={24} />,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  const getExamMetrics = (): DashboardMetric[] => [
    {
      label: 'Upcoming Exams',
      value: 8,
      icon: <AlertCircle size={24} />,
      color: 'bg-red-100 text-red-600',
    },
    {
      label: 'Exam Halls',
      value: 12,
      icon: <Users size={24} />,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Results Published',
      value: 15,
      icon: <TrendingUp size={24} />,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Pending Results',
      value: 3,
      icon: <AlertCircle size={24} />,
      color: 'bg-yellow-100 text-yellow-600',
    },
  ];

  const getRoleMetrics = () => {
    switch (staffRole) {
      case 'faculty':
        return getFacultyMetrics();
      case 'hod':
        return getHODMetrics();
      case 'placement':
        return getPlacementMetrics();
      case 'exam_coordinator':
        return getExamMetrics();
      default:
        return getFacultyMetrics();
    }
  };

  const roleLabel = {
    faculty: 'Faculty Member',
    hod: 'Head of Department',
    placement: 'Placement Officer',
    exam_coordinator: 'Exam Coordinator',
    admin: 'Administrator',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">{staffName}</h1>
        <p className="mt-1 text-blue-100">
          {roleLabel[staffRole]}
          {staffDepartment && ` • ${staffDepartment}`}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(metrics.length > 0 ? metrics : getFacultyMetrics()).map((metric, idx) => (
          <div key={idx} className="bg-white rounded-lg p-6 border border-slate-200 hover:shadow-lg transition">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${metric.color}`}>
              {metric.icon}
            </div>
            <h3 className="mt-4 text-slate-600 text-sm font-medium">{metric.label}</h3>
            <p className="mt-2 text-2xl font-bold text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions - Role Specific */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffRole === 'faculty' && (
            <>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Mark Attendance</h3>
                <p className="text-sm text-slate-600 mt-1">Mark student attendance for today</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Enter Marks</h3>
                <p className="text-sm text-slate-600 mt-1">Upload exam marks for your students</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">View Timetable</h3>
                <p className="text-sm text-slate-600 mt-1">Check your class schedule</p>
              </button>
            </>
          )}

          {staffRole === 'hod' && (
            <>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Department Stats</h3>
                <p className="text-sm text-slate-600 mt-1">View department overview</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Manage Staff</h3>
                <p className="text-sm text-slate-600 mt-1">Manage department staff</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Performance Reports</h3>
                <p className="text-sm text-slate-600 mt-1">View student performance</p>
              </button>
            </>
          )}

          {staffRole === 'placement' && (
            <>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Post Job</h3>
                <p className="text-sm text-slate-600 mt-1">Create new job opening</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Schedule Interview</h3>
                <p className="text-sm text-slate-600 mt-1">Organize interview sessions</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Shortlist Students</h3>
                <p className="text-sm text-slate-600 mt-1">Select students for roles</p>
              </button>
            </>
          )}

          {staffRole === 'exam_coordinator' && (
            <>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Schedule Exam</h3>
                <p className="text-sm text-slate-600 mt-1">Create new exam schedule</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Allocate Halls</h3>
                <p className="text-sm text-slate-600 mt-1">Assign exam halls</p>
              </button>
              <button className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition text-left">
                <h3 className="font-semibold text-slate-900">Publish Results</h3>
                <p className="text-sm text-slate-600 mt-1">Release exam results</p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-slate-900">Attendance marked for CSE-5A</p>
              <p className="text-xs text-slate-500">Today at 10:30 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-slate-900">Marks uploaded for Mid Semester</p>
              <p className="text-xs text-slate-500">Yesterday at 2:15 PM</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
            <div>
              <p className="text-sm font-medium text-slate-900">Department meeting scheduled</p>
              <p className="text-xs text-slate-500">April 12, 2026 at 11:00 AM</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
