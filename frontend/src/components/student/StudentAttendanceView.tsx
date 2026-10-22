import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, BarChart3, Filter } from 'lucide-react';
import { fetchStudentAttendance, fetchStudentAttendanceDetailed } from '../../api/campusApi';
import { getStoredAuthToken } from '../../utils/auth';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
} from '@/components/ui';

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

        const token = getStoredAuthToken();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge variant="success">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'late':
        return <Badge variant="warning">Late</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPercentageBadge = (percentage: number) => {
    if (percentage >= 75) {
      return (
        <Badge variant="success" className="font-bold">
          {percentage.toFixed(1)}% Safe
        </Badge>
      );
    }
    if (percentage >= 65) {
      return (
        <Badge variant="warning" className="font-bold">
          {percentage.toFixed(1)}% Warning
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="font-bold">
        {percentage.toFixed(1)}% Critical
      </Badge>
    );
  };

  const filteredRecords = selectedSubject
    ? records.filter((r) => r.subject === selectedSubject)
    : records;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Record</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Loading course attendance metrics...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Record</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Track your attendance compliance</p>
        </div>
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle size={18} />
          <AlertTitle>Error Loading Attendance</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Academic Attendance</h2>
            <Badge variant="outline" className="font-bold text-xs">
              75% Required Threshold
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Monitor subject attendance, track absences, and maintain exam eligibility criteria
          </p>
        </div>
      </div>

      {/* Summary Course Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {summary.map((item, idx) => {
          const isSelected = selectedSubject === item.subject;
          return (
            <Card
              key={idx}
              onClick={() => setSelectedSubject(isSelected ? null : item.subject)}
              className={`rounded-2xl cursor-pointer transition-all hover:shadow-md border ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-100 shadow-sm'
                  : 'border-slate-200/90 bg-white hover:border-slate-300'
              }`}
            >
              <CardHeader className="p-5 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-bold text-slate-900 truncate">
                    {item.subject}
                  </CardTitle>
                  {getPercentageBadge(item.percentage)}
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-1 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{item.total}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Present</p>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">{item.present}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                    <p className="text-[10px] uppercase font-bold text-rose-600">Absent</p>
                    <p className="text-sm font-black text-rose-700 mt-0.5">{item.absent}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.percentage >= 75
                          ? 'bg-emerald-500'
                          : item.percentage >= 65
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert for Low Attendance */}
      {summary.some((s) => s.percentage < 75) && (
        <Alert variant="warning" className="rounded-2xl">
          <AlertCircle size={18} />
          <AlertTitle>Low Attendance Warning</AlertTitle>
          <AlertDescription className="text-xs">
            One or more enrolled subjects are below the university 75% minimum threshold. Contact your course faculty to reconcile leave certificates and attend remaining lecture sessions.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Records Table */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-3 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              {selectedSubject ? `Session Log: ${selectedSubject}` : 'Full Attendance Log'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {filteredRecords.length} session entry logs recorded
            </CardDescription>
          </div>

          {selectedSubject && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSubject(null)}
              className="h-8 text-xs font-semibold rounded-xl"
            >
              Clear Filter
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Subject / Course</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Attendance Status</TableHead>
                <TableHead className="text-right">Marked By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-slate-50/70 transition">
                    <TableCell className="font-bold text-slate-900 text-xs">
                      {record.subject}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {record.date}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(record.status)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-slate-600">
                      {record.markedBy}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-xs text-slate-500">
                    No attendance records match the selected filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAttendanceView;
