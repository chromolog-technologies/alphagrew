import React, { useState, useEffect } from 'react';
import { BarChart3, Loader, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { getStoredAuthToken } from '../../utils/auth';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

interface AttendanceSummary {
  total_classes: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  status: string;
}

interface SubjectAttendance {
  subject?: {
    id: number;
    name: string;
    code: string;
  };
  student?: string;
  total_classes: number;
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  status: string;
}

interface AttendanceReportProps {
  studentId?: number;
  subjectId?: number;
  fromDate?: string;
  toDate?: string;
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({
  studentId,
  subjectId,
  fromDate,
  toDate,
}) => {
  const [report, setReport] = useState<{
    student?: any;
    overall?: AttendanceSummary;
    by_subject?: SubjectAttendance[];
    summary?: SubjectAttendance[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'student' | 'subject'>('student');

  const token = getStoredAuthToken();


  useEffect(() => {
    fetchReport();
  }, [studentId, subjectId, fromDate, toDate, reportType]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '';
      let params: any = {};

      if (reportType === 'student' && studentId) {
        url = `${API_BASE_URL}/attendance/student/${studentId}/report`;
      } else if (reportType === 'subject' && subjectId) {
        url = `${API_BASE_URL}/attendance/subject/${subjectId}/report`;
        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;
      } else {
        setError('Please provide required information');
        setLoading(false);
        return;
      }

      let finalUrl = url;
      if (params && Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams(params).toString();
        finalUrl = `${url}?${queryParams}`;
      }

      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load report');
      }

      const data = await response.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="animate-spin" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-3 text-red-800">
        <AlertCircle size={24} />
        <span>{error}</span>
      </div>
    );
  }

  if (!report) {
    return <div className="text-gray-500">No report data available</div>;
  }

  const renderAttendanceBar = (percentage: number) => {
    const color = percentage >= 75 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${color} transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="font-bold text-sm min-w-12">{percentage}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="student"
            checked={reportType === 'student'}
            onChange={(e) => setReportType(e.target.value as 'student' | 'subject')}
            className="w-4 h-4"
          />
          <span className="text-gray-700">Student Report</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            value="subject"
            checked={reportType === 'subject'}
            onChange={(e) => setReportType(e.target.value as 'student' | 'subject')}
            className="w-4 h-4"
          />
          <span className="text-gray-700">Subject Report</span>
        </label>
      </div>

      {/* Student Overview */}
      {report.student && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">{report.student.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600">Roll Number</div>
              <div className="font-bold text-lg text-gray-800">{report.student.roll_number}</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm text-gray-600">Email</div>
              <div className="font-bold text-gray-800 truncate">{report.student.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Overall Summary */}
      {report.overall && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-600">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={24} className="text-blue-600" />
              Overall Attendance
            </h3>
            <span
              className={`px-4 py-2 rounded-full font-semibold ${
                report.overall.percentage >= 75
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {report.overall.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Total Classes</div>
              <div className="text-3xl font-bold text-blue-600">{report.overall.total_classes}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Present</div>
              <div className="text-3xl font-bold text-green-600">{report.overall.present}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Absent</div>
              <div className="text-3xl font-bold text-red-600">{report.overall.absent}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">Leave</div>
              <div className="text-3xl font-bold text-yellow-600">{report.overall.leave}</div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendance Percentage
            </label>
            {renderAttendanceBar(report.overall.percentage)}
          </div>
        </div>
      )}

      {/* By Subject/Student Summary */}
      {(report.by_subject || report.summary) && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart3 size={24} className="text-purple-600" />
            {reportType === 'student' ? 'Subject-wise Breakdown' : 'Student-wise Breakdown'}
          </h3>

          <div className="space-y-4">
            {(report.by_subject || report.summary)?.map((item: SubjectAttendance, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      {item.subject?.name || item.student}
                    </h4>
                    <p className="text-sm text-gray-600">{item.subject?.code}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      item.percentage >= 75
                        ? 'bg-green-100 text-green-800'
                        : item.percentage >= 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Total</div>
                    <div className="font-bold text-gray-800">{item.total_classes}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Present</div>
                    <div className="font-bold text-green-600">{item.present}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Absent</div>
                    <div className="font-bold text-red-600">{item.absent}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Leave</div>
                    <div className="font-bold text-yellow-600">{item.leave}</div>
                  </div>
                </div>

                {renderAttendanceBar(item.percentage)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {report.overall && report.overall.percentage < 75 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
          <p className="text-yellow-800">
            <strong>⚠️ Warning:</strong> Your attendance is below 75%. You may be at risk of not
            being eligible for exams. Please contact your department office.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceReport;
