import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader, Save, Plus, Trash2 } from 'lucide-react';
import { getStoredToken } from '../../api/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

interface Student {
  id: number;
  roll_number: string;
  name: string;
  email: string;
}

interface AttendanceRecord {
  student_id: number;
  status: 'present' | 'absent' | 'leave' | 'other';
}

interface MarkAttendanceProps {
  onSuccess?: () => void;
}

export const AttendanceMarkForm: React.FC<MarkAttendanceProps> = ({ onSuccess }) => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = getStoredToken();


  // Load subjects on mount
  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/subjects`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load subjects');
      }
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load subjects',
      });
    }
  };

  const handleSubjectChange = async (subjectId: number) => {
    setSelectedSubject(subjectId);
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/subject/${subjectId}/students`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to load students');
      }

      const data = await response.json();
      setStudents(data.students || []);

      // Initialize attendance records
      const initialAttendance = (data.students || []).map(
        (student: Student) => ({
          student_id: student.id,
          status: 'present' as const,
        })
      );
      setAttendance(initialAttendance);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load students',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: number, status: string) => {
    setAttendance((prev) =>
      prev.map((record) =>
        record.student_id === studentId
          ? { ...record, status: status as AttendanceRecord['status'] }
          : record
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubject) {
      setMessage({ type: 'error', text: 'Please select a subject' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/mark`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject_id: selectedSubject,
            attendance_data: attendance,
            attendance_date: attendanceDate,
            remarks,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to mark attendance');
      }

      const data = await response.json();

      setMessage({
        type: 'success',
        text: `Attendance marked for ${data.created} students`,
      });

      // Reset form
      setAttendance([]);
      setRemarks('');
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to mark attendance',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Mark Attendance</h2>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <Check size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subject Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Subject *
            </label>
            <select
              value={selectedSubject || ''}
              onChange={(e) => handleSubjectChange(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose a subject...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </option>
              ))}
            </select>
          </div>

          {/* Attendance Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendance Date *
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g., Guest lecture"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Students Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="animate-spin" size={32} />
          </div>
        ) : attendance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Roll Number
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Student Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const record = attendance.find((a) => a.student_id === student.id);
                  return (
                    <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-800">{student.roll_number}</td>
                      <td className="px-4 py-3 text-gray-800">{student.name}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{student.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-center">
                          {['present', 'absent', 'leave', 'other'].map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                handleStatusChange(
                                  student.id,
                                  status as AttendanceRecord['status']
                                )
                              }
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                record?.status === status
                                  ? 'bg-blue-600 text-white shadow-lg'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : selectedSubject ? (
          <div className="text-center py-8 text-gray-500">
            No students found for this subject
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Please select a subject to see students
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
          <button
            type="reset"
            onClick={() => {
              setSelectedSubject(null);
              setAttendance([]);
              setRemarks('');
            }}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={submitting || attendance.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {submitting ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
            {submitting ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AttendanceMarkForm;
