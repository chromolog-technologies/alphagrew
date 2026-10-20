import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Clock, Loader, AlertCircle } from 'lucide-react';
import { fetchStudentTimetable, fetchStudentTimetableByDay } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';

interface ClassSession {
  id: number;
  courseCode: string;
  courseName: string;
  faculty: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  building: string;
  semester: number;
}

export const StudentTimetableView: React.FC = () => {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [totalLearningHours, setTotalLearningHours] = useState(0);
  const [uniqueFaculty, setUniqueFaculty] = useState(0);

  useEffect(() => {
    const fetchTimetableData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getStoredToken();
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }


        const response = await fetchStudentTimetable(token);

        if (response.success && Array.isArray(response.data)) {
          const timetableData = response.data.map((session: any, idx: number) => ({
            id: idx + 1,
            courseCode: session.course_code || 'Unknown',
            courseName: session.course_name || 'Unknown Course',
            faculty: session.faculty || 'Faculty',
            day: session.day || 'Monday',
            startTime: session.start_time || '09:00',
            endTime: session.end_time || '11:00',
            room: session.room || '101',
            building: session.building || 'A',
            semester: session.semester || 4,
          }));
          setClasses(timetableData);

          // Calculate stats
          const hours = timetableData.length * 2; // Assuming 2 hours per class
          setTotalLearningHours(hours);
          const facultySet = new Set(timetableData.map((c: ClassSession) => c.faculty));
          setUniqueFaculty(facultySet.size);
        }
      } catch (err) {
        console.error('Failed to fetch timetable:', err);
        setError(err instanceof Error ? err.message : 'Failed to load timetable. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTimetableData();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todaySessions = classes.filter((c) => c.day === selectedDay);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const getTimeColor = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 12) return 'bg-blue-50 border-blue-200';
    if (hour < 14) return 'bg-green-50 border-green-200';
    if (hour < 17) return 'bg-purple-50 border-purple-200';
    return 'bg-orange-50 border-orange-200';
  };

  const getTimeSlotColor = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 12) return 'bg-blue-100 text-blue-800';
    if (hour < 14) return 'bg-green-100 text-green-800';
    if (hour < 17) return 'bg-purple-100 text-purple-800';
    return 'bg-orange-100 text-orange-800';
  };

  const totalClasses = classes.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Timetable</h2>
          <p className="mt-1 text-sm text-slate-600">Loading your schedule...</p>
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
          <h2 className="text-2xl font-bold text-slate-900">My Timetable</h2>
          <p className="mt-1 text-sm text-slate-600">View your class schedule</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-900">Error Loading Timetable</h4>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Timetable</h2>
        <p className="mt-1 text-sm text-slate-600">4th Semester | 6 Courses</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium">Total Classes/Week</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">{totalClasses}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">Faculty Members</p>
          <p className="text-3xl font-bold text-green-900 mt-2">{uniqueFaculty}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-700 font-medium">Learning Hours/Week</p>
          <p className="text-3xl font-bold text-purple-900 mt-2">{totalLearningHours}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
              selectedDay === day
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-3">
          {todaySessions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <Calendar size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600 font-medium">No classes on {selectedDay}</p>
            </div>
          ) : (
            todaySessions.map((session) => (
              <div
                key={session.id}
                className={`border-l-4 p-5 rounded-lg transition hover:shadow-lg ${getTimeColor(session.startTime)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${getTimeSlotColor(session.startTime)}`}>
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{session.courseName}</h3>
                    <p className="text-sm text-slate-600 mt-1">{session.courseCode}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-900">Sem {session.semester}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-500" />
                    <span className="text-slate-700">{session.faculty}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-slate-500" />
                    <span className="text-slate-700">
                      {session.building}-{session.room}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-500" />
                    <span className="text-slate-700">2 hrs</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Course</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Time</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Faculty</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Location</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">Day</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((session) => (
                <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{session.courseName}</p>
                      <p className="text-xs text-slate-600">{session.courseCode}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{session.faculty}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {session.building}-{session.room}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {session.day}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Weekly Overview */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">Weekly Overview</h3>
        <div className="grid grid-cols-6 gap-2">
          {days.map((day) => {
            const dayClasses = classes.filter((c) => c.day === day);
            return (
              <div key={day} className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-semibold text-slate-900">{day.slice(0, 3)}</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">{dayClasses.length}</p>
                <p className="text-xs text-slate-600 mt-1">classes</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Option */}
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-lg p-4 text-center">
        <p className="text-sm text-slate-600 mb-3">Download your timetable</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          Download as PDF
        </button>
      </div>
    </div>
  );
};
