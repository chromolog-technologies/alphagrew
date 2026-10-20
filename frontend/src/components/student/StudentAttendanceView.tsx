import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertCircle, BarChart3, Loader } from 'lucide-react';
import { fetchStudentAttendance, fetchStudentAttendanceDetailed } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';

interface AttendanceRecord {
  id: number;
  subject: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  markedBy: string;
}

interface AttendanceSummary {
  subject: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
  status?: string;
}

export const StudentAttendanceView: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = getStoredToken();
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }


        // Fetch summary and detailed records
        const [summaryResponse, detailedResponse] = await Promise.all([
          fetchStudentAttendance(token),
          fetchStudentAttendanceDetailed(token),
        ]);

        // Format summary data
        if (summaryResponse.success && summaryResponse.data) {
          const summaryData = Object.entries(summaryResponse.data).map(([subject, data]: any) => ({
            subject,
            total: data.total || 0,
            present: data.present || 0,
            absent: data.absent || 0,
            late: data.late || 0,
            percentage: data.percentage || 0,
            status: data.status || 'warning',
          }));
          setSummary(summaryData);
        }

        // Format detailed records
        if (detailedResponse.success && Array.isArray(detailedResponse.data)) {
          const recordsData = detailedResponse.data.map((record: any, idx: number) => ({
            id: idx + 1,
            subject: record.subject || 'Unknown',
            date: record.date || new Date().toISOString().split('T')[0],
            status: record.status || 'absent',
            markedBy: record.marked_by || 'Faculty',
          }));
          setRecords(recordsData);
        }
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
        setError(err instanceof Error ? err.message : 'Failed to load attendance data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 65) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredRecords = selectedSubject
    ? records.filter((r) => r.subject === selectedSubject)
    : records;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
          <p className="mt-1 text-sm text-slate-600">Track your attendance records</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
          <p className="mt-1 text-sm text-slate-600">Track your attendance records</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-900">Error Loading Attendance</h4>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Attendance</h2>
        <p className="mt-1 text-sm text-slate-600">Track your attendance records</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summary.map((item, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedSubject(item.subject)}
            className={`p-4 rounded-lg border cursor-pointer transition ${
              selectedSubject === item.subject
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <h3 className="font-semibold text-slate-900">{item.subject}</h3>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Classes:</span>
                <span className="font-semibold">{item.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Present:</span>
                <span className="font-semibold text-green-600">{item.present}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Absent:</span>
                <span className="font-semibold text-red-600">{item.absent}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">Attendance %</span>
                  <span className={`font-bold text-lg ${getPercentageColor(item.percentage)}`}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      item.percentage >= 75 ? 'bg-green-500' : item.percentage >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert for Low Attendance */}
      {summary.some((s) => s.percentage < 75) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-yellow-900">Low Attendance Alert</h4>
            <p className="text-sm text-yellow-800 mt-1">
              Your attendance in some subjects is below 75%. Please contact your faculty to improve your attendance.
            </p>
          </div>
        </div>
      )}

      {/* Detailed Records */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">
            {selectedSubject ? `Records - ${selectedSubject}` : 'All Records'}
          </h3>
          {selectedSubject && (
            <button
              onClick={() => setSelectedSubject(null)}
              className="text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              Clear Filter
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Subject</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Marked By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900">{record.subject}</td>
                  <td className="px-4 py-3 text-slate-600 flex items-center gap-2">
                    <Calendar size={14} /> {record.date}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{record.markedBy}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
