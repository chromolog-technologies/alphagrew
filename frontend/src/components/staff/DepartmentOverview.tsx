import React, { useState, useEffect } from 'react';
import { Users, BarChart3, TrendingUp, AlertCircle } from 'lucide-react';
import { fetchDepartmentOverview, fetchDepartmentPerformance, fetchDepartmentBudget } from '../../api/campusApi';
import { PrototypeNotice } from '../shared';

interface DepartmentStats {
  totalStudents: number;
  totalFaculty: number;
  averageCGPA: number;
  placementRate: number;
}

interface SchoolPerformance {
  semester: string;
  averageCGPA: number;
  enrolledStudents: number;
  passPercentage: number;
}

export const DepartmentOverview: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const [overviewResponse, performanceResponse] = await Promise.all([
          fetchDepartmentOverview(token),
          fetchDepartmentPerformance(token)
        ]);

        if (overviewResponse?.data) {
          setStats(overviewResponse.data);
        }

        if (performanceResponse?.data) {
          setPerformance(performanceResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch department data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading department data...</p>
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

  const defaultStats = {
    totalStudents: stats?.total_students || 0,
    totalFaculty: stats?.total_faculty || 0,
    averageCGPA: stats?.average_cgpa || 0,
    placementRate: stats?.placement_rate || 0,
  };

  const schoolPerformance: SchoolPerformance[] = performance?.schoolPerformance || [];
  const coursePerformance: any[] = performance?.coursePerformance || [];
  const placementData: any[] = performance?.placementData || [];

  return (
    <div className="space-y-6">
      <PrototypeNotice />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Department Overview</h2>
        <p className="mt-1 text-sm text-slate-600">Computer Science & Engineering Department</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Students</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{defaultStats.totalStudents}</p>
            </div>
            <Users size={32} className="text-blue-300" />
          </div>
        </div>
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">Faculty Members</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{defaultStats.totalFaculty}</p>
            </div>
            <Users size={32} className="text-purple-300" />
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Avg. CGPA</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{defaultStats.averageCGPA}/10</p>
            </div>
            <TrendingUp size={32} className="text-green-300" />
          </div>
        </div>
        <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Placement Rate</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{defaultStats.placementRate}%</p>
            </div>
            <BarChart3 size={32} className="text-orange-300" />
          </div>
        </div>
      </div>

      {/* Semester Performance */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Semester Performance Trend</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-2 text-left font-semibold text-slate-900">Semester</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-900">Avg. CGPA</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-900">Enrolled</th>
                <th className="px-4 py-2 text-right font-semibold text-slate-900">Pass %</th>
              </tr>
            </thead>
            <tbody>
              {schoolPerformance.map((perf, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{perf.semester}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-green-600">{perf.averageCGPA}/10</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{perf.enrolledStudents}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      {perf.passPercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course-wise Performance */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Course-wise Performance</h3>
        <div className="space-y-4">
          {coursePerformance.map((course, idx) => (
            <div key={idx} className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">{course.course}</h4>
                <span className="text-sm font-semibold text-slate-600">{course.students} students</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(course.avgCGPA / 10) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-slate-900 w-16 text-right">{course.avgCGPA}/10</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Placement Distribution */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Placement Package Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {placementData.map((data, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <span className="font-medium text-slate-900">{data.packageRange}</span>
              <div className="flex items-center gap-3">
                <div className="w-24 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(data.count / 68) * 100}%` }}
                  />
                </div>
                <span className="font-bold text-slate-900 w-8 text-right">{data.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-yellow-900">Action Required</h4>
            <p className="text-sm text-yellow-800 mt-1">3 faculty members have pending appraisals</p>
          </div>
        </div>
      </div>
    </div>
  );
};
