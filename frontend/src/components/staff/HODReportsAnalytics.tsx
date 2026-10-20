import React, { useState, useEffect } from 'react';
import { Download, Filter, TrendingUp, Users, BarChart3, PieChart } from 'lucide-react';
import { fetchAcademicPerformanceReport, fetchAttendanceReportForDept, fetchPlacementAnalyticsReport } from '../../api/campusApi';
import { PrototypeNotice } from '../shared';

interface StudentPerformance {
  name: string;
  rollNumber: string;
  cgpa: number;
  attendance: number;
  semester: number;
  status: 'excellent' | 'good' | 'average' | 'need_improvement';
}

interface DepartmentReport {
  semester: string;
  totalStudents: number;
  avgCGPA: number;
  passPercentage: number;
  attendanceRate: number;
}

export const HODReportsAnalytics: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  const [reportType, setReportType] = useState('performance');
  const [selectedSemester, setSelectedSemester] = useState('');
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

        const response = await fetchAcademicPerformanceReport(token);
        if (response?.data) {
          const reportsList = Array.isArray(response.data) ? response.data : 
            response.data.reports || [];
          setReports(reportsList);
          if (reportsList.length > 0) setSelectedSemester(reportsList[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'average':
        return 'bg-yellow-100 text-yellow-800';
      case 'need_improvement':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading reports...</p>
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

  const currentReport = reports.find((r: any) => r === selectedSemester) || reports[reports.length - 1] || {};
  const defaultReport = {
    avgCGPA: currentReport?.avg_cgpa || 7.5,
    passPercentage: currentReport?.pass_percentage || 95,
    attendanceRate: currentReport?.attendance_rate || 88,
    totalStudents: currentReport?.total_students || 120,
  };

  const performanceStats = [
    {
      label: 'Average CGPA',
      value: defaultReport.avgCGPA.toFixed(2),
      color: 'blue',
      icon: <BarChart3 size={32} />,
    },
    {
      label: 'Pass Percentage',
      value: `${defaultReport.passPercentage}%`,
      color: 'green',
      icon: <TrendingUp size={32} />,
    },
    {
      label: 'Attendance Rate',
      value: `${defaultReport.attendanceRate}%`,
      color: 'purple',
      icon: <Users size={32} />,
    },
    {
      label: 'Total Students',
      value: defaultReport.totalStudents,
      color: 'orange',
      icon: <PieChart size={32} />,
    },
  ];

  const studentDistribution = {
    excellent: studentPerformance.filter((s) => s.status === 'excellent').length,
    good: studentPerformance.filter((s) => s.status === 'good').length,
    average: studentPerformance.filter((s) => s.status === 'average').length,
    need_improvement: studentPerformance.filter((s) => s.status === 'need_improvement').length,
  };

  return (
    <div className="space-y-6">
      <PrototypeNotice />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Department Reports & Analytics</h2>
        <p className="mt-1 text-sm text-slate-600">Analyze departmental performance and student metrics</p>
      </div>

      {/* Semester Selector */}
      <div className="flex gap-4 flex-wrap items-center">
        <label className="font-medium text-slate-700">Select Semester:</label>
        <div className="flex gap-2">
          {reports.map((report) => (
            <button
              key={report.semester}
              onClick={() => setSelectedSemester(report.semester)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedSemester === report.semester
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {report.semester}
            </button>
          ))}
        </div>
        <button className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium">
          <Download size={18} />
          Download Report
        </button>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceStats.map((stat, idx) => (
          <div
            key={idx}
            className={`bg-${stat.color}-50 border-2 border-${stat.color}-200 p-6 rounded-lg flex items-center justify-between`}
          >
            <div>
              <p className={`text-sm text-${stat.color}-700 font-medium`}>{stat.label}</p>
              <p className={`text-4xl font-bold text-${stat.color}-900 mt-2`}>{stat.value}</p>
            </div>
            <div className={`text-${stat.color}-300`}>{stat.icon}</div>
          </div>
        ))}
      </div>

      {/* Student Performance Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">Student Performance Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">Excellent (8.0 - 10.0)</span>
                <span className="text-sm font-bold text-green-600">{studentDistribution.excellent} students</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${(studentDistribution.excellent / studentPerformance.length) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">Good (7.0 - 8.0)</span>
                <span className="text-sm font-bold text-blue-600">{studentDistribution.good} students</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${(studentDistribution.good / studentPerformance.length) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">Average (6.0 - 7.0)</span>
                <span className="text-sm font-bold text-yellow-600">{studentDistribution.average} students</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-yellow-600 h-3 rounded-full"
                  style={{ width: `${(studentDistribution.average / studentPerformance.length) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900">Need Improvement (&lt;6.0)</span>
                <span className="text-sm font-bold text-red-600">{studentDistribution.need_improvement} students</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="bg-red-600 h-3 rounded-full"
                  style={{ width: `${(studentDistribution.need_improvement / studentPerformance.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Semester Comparison */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="font-bold text-slate-900 mb-4">Semester Comparison</h3>
          <div className="space-y-4">
            {reports.map((report, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                <p className="font-semibold text-slate-900 mb-3">{report.semester}</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">Avg CGPA</p>
                    <p className="font-bold text-slate-900 mt-1">{report.avgCGPA}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Pass %</p>
                    <p className="font-bold text-green-600 mt-1">{report.passPercentage}%</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Attend %</p>
                    <p className="font-bold text-blue-600 mt-1">{report.attendanceRate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Student Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Student Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Roll No.</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">CGPA</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-900">Attendance</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
              </tr>
            </thead>
            <tbody>
              {studentPerformance.map((student, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{student.rollNumber}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-slate-900">{student.cgpa.toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-slate-900">{student.attendance}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                        student.status,
                      )}`}
                    >
                      {student.status.split('_').join(' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Generation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-bold text-blue-900 mb-4">Generate Custom Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Report Type: Performance Summary</option>
            <option>Detailed Student Report</option>
            <option>Course-wise Analytics</option>
            <option>Faculty Evaluation</option>
          </select>
          <select className="px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Format: PDF</option>
            <option>Excel</option>
            <option>CSV</option>
          </select>
        </div>
        <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
          Generate Report
        </button>
      </div>
    </div>
  );
};
