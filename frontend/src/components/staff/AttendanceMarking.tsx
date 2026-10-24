import React, { useState, useEffect } from 'react';
import { Plus, Search, Check, X, AlertCircle } from 'lucide-react';
import { fetchStaffAttendanceStudents, submitStaffAttendance, fetchStaffClasses } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';
import { PrototypeNotice } from '../shared';

interface AttendanceMarkingProps {
  staffRole: 'faculty' | 'hod' | 'admin';
}

interface StudentAttendance {
  id: number;
  name: string;
  rollNo: string;
  status: 'present' | 'absent' | 'late' | null;
}

export const AttendanceMarking: React.FC<AttendanceMarkingProps> = ({ staffRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    unmarked: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getStoredAuthToken();

        if (!token) {
          setError('Authentication token not found');
          return;
        }


        // Fetch available classes
        const classesResponse = await fetchStaffClasses(token);
        if (classesResponse?.data) {
          const classList = Array.isArray(classesResponse.data) ? classesResponse.data : 
            classesResponse.data.classes || [];
          setClasses(classList);
          if (classList.length > 0) setSelectedClass(classList[0]?.id || classList[0] || '');
        }

        // Fetch students for the selected class
        if (selectedClass) {
          const studentsResponse = await fetchStaffAttendanceStudents(token, 
            typeof selectedClass === 'string' ? parseInt(selectedClass) : selectedClass);
          if (studentsResponse?.data) {
            const studentsList = Array.isArray(studentsResponse.data) ? 
              studentsResponse.data : studentsResponse.data.students || [];
            setStudents(studentsList.map((s: any) => ({
              ...s,
              status: null
            })));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClass]);

  useEffect(() => {
    const newStats = {
      present: students.filter((s) => s.status === 'present').length,
      absent: students.filter((s) => s.status === 'absent').length,
      late: students.filter((s) => s.status === 'late').length,
      unmarked: students.filter((s) => s.status === null).length,
    };
    setStats(newStats);
  }, [students]);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.rollNo.includes(searchTerm)
  );

  const updateAttendance = (studentId: number, status: 'present' | 'absent' | 'late') => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status } : s))
    );
  };

  const handleSubmit = async () => {
    if (stats.unmarked > 0) {
      alert(`Please mark attendance for all ${stats.unmarked} students`);
      return;
    }
    try {
      const token = getStoredAuthToken();

      if (!token) return;

      const payload = {
        date: selectedDate,
        class_id: selectedClass,
        subject_id: selectedSubject,
        students: students.map(s => ({
          student_id: s.id,
          status: s.status
        }))
      };

      await submitStaffAttendance(token, payload);
      alert('Attendance marked successfully!');
      setStudents(students.map(s => ({ ...s, status: null })));
    } catch (err) {
      alert('Error submitting attendance: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const subjects = ['Database Management', 'Data Structures', 'Web Development'];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading attendance data...</p>
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
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mark Attendance</h2>
        <p className="mt-1 text-sm text-slate-600">Record student attendance for your class</p>
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Class</option>
            {classes.map((cls: any) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {subjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">Time</label>
          <input
            type="time"
            defaultValue="09:00"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 font-medium">Present</p>
          <p className="text-2xl font-bold text-green-900">{stats.present}</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-sm text-red-700 font-medium">Absent</p>
          <p className="text-2xl font-bold text-red-900">{stats.absent}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-700 font-medium">Late</p>
          <p className="text-2xl font-bold text-yellow-900">{stats.late}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p className="text-sm text-slate-700 font-medium">Unmarked</p>
          <p className="text-2xl font-bold text-slate-900">{stats.unmarked}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or roll number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Roll No.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Attendance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{student.name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{student.rollNo}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateAttendance(student.id, 'present')}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition ${
                        student.status === 'present'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Mark Present"
                    >
                      <Check size={16} /> P
                    </button>
                    <button
                      onClick={() => updateAttendance(student.id, 'absent')}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition ${
                        student.status === 'absent'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Mark Absent"
                    >
                      <X size={16} /> A
                    </button>
                    <button
                      onClick={() => updateAttendance(student.id, 'late')}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition ${
                        student.status === 'late'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Mark Late"
                    >
                      <AlertCircle size={16} /> L
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={stats.unmarked > 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Attendance
        </button>
      </div>
    </div>
  );
};
