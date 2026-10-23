import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, User, Clock, AlertCircle, Download, BookOpen, Layers } from 'lucide-react';
import { fetchStudentTimetable } from '../../api/campusApi';
import { getStoredAuthToken } from '../../utils/auth';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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

        const token = getStoredAuthToken();
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
          const hours = timetableData.length * 2;
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

  const getTimeSlotBadge = (startTime: string) => {
    const hour = parseInt(startTime.split(':')[0]);
    if (hour < 12) return <Badge variant="info">Morning Slot</Badge>;
    if (hour < 14) return <Badge variant="success">Midday Slot</Badge>;
    if (hour < 17) return <Badge variant="secondary">Afternoon Slot</Badge>;
    return <Badge variant="warning">Evening Slot</Badge>;
  };

  const totalClasses = classes.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Academic Timetable</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Loading your weekly course schedule...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Academic Timetable</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">View your class schedule</p>
        </div>
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle size={18} />
          <AlertTitle>Error Loading Timetable</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Academic Timetable</h2>
            <Badge variant="secondary" className="font-semibold text-xs">
              Semester 4
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Active enrolled classes, lecture venues, and weekly faculty schedules
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="gap-2 rounded-xl text-xs font-semibold self-start sm:self-auto"
        >
          <Download size={14} />
          Print / Export Schedule
        </Button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-gradient-to-br from-blue-50/50 to-white">
          <CardHeader className="p-5 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Total Classes/Week</span>
              <BookOpen size={16} className="text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-3xl font-extrabold text-blue-950 mt-1">{totalClasses}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Scheduled lecture & lab blocks</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-gradient-to-br from-emerald-50/50 to-white">
          <CardHeader className="p-5 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Faculty Members</span>
              <User size={16} className="text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-3xl font-extrabold text-emerald-950 mt-1">{uniqueFaculty}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Dedicated instructors assigned</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-gradient-to-br from-purple-50/50 to-white">
          <CardHeader className="p-5 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Learning Hours</span>
              <Clock size={16} className="text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-3xl font-extrabold text-purple-950 mt-1">{totalLearningHours} hrs</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Classroom engagement per week</p>
          </CardContent>
        </Card>
      </div>

      {/* View Mode & Day Filter Toolbar */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Day Selector */}
          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {days.map((day) => (
              <Button
                key={day}
                size="sm"
                variant={selectedDay === day ? 'default' : 'ghost'}
                onClick={() => setSelectedDay(day)}
                className={`rounded-xl text-xs font-semibold px-3.5 transition ${
                  selectedDay === day ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                {day}
              </Button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 self-end sm:self-auto">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              onClick={() => setViewMode('grid')}
              className={`h-7 px-3 text-xs font-bold rounded-lg transition ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grid View
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              onClick={() => setViewMode('list')}
              className={`h-7 px-3 text-xs font-bold rounded-lg transition ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List View
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-3">
          {todaySessions.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 p-12 text-center text-slate-500">
              <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800">No classes scheduled on {selectedDay}</p>
              <p className="text-xs text-slate-500 mt-1">Enjoy your study block or preparation time!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {todaySessions.map((session) => (
                <Card
                  key={session.id}
                  className="rounded-2xl border-slate-200/90 shadow-xs hover:border-blue-300 transition-all hover:shadow-md overflow-hidden border-l-4 border-l-blue-600"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          {getTimeSlotBadge(session.startTime)}
                          <span className="text-xs font-bold text-slate-600">
                            {formatTime(session.startTime)} - {formatTime(session.endTime)}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{session.courseName}</h3>
                        <p className="text-xs text-slate-500 font-medium">{session.courseCode}</p>
                      </div>

                      <Badge variant="outline" className="self-start sm:self-auto text-xs font-semibold">
                        Sem {session.semester}
                      </Badge>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User size={15} className="text-slate-400 shrink-0" />
                        <span className="font-medium truncate">{session.faculty}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin size={15} className="text-slate-400 shrink-0" />
                        <span className="font-medium">
                          Building {session.building} • Room {session.room}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock size={15} className="text-slate-400 shrink-0" />
                        <span className="font-medium">2 Hours Duration</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead>Course</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Day</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map((session) => (
                <TableRow key={session.id} className="hover:bg-slate-50/70 transition">
                  <TableCell>
                    <p className="font-bold text-slate-900">{session.courseName}</p>
                    <p className="text-xs text-slate-500">{session.courseCode}</p>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">
                    {formatTime(session.startTime)} - {formatTime(session.endTime)}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">
                    {session.faculty}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">
                    Bldg {session.building} - {session.room}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-semibold text-[11px]">
                      {session.day}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Weekly Overview */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs">
        <CardHeader className="p-6 pb-3">
          <CardTitle className="text-base font-bold text-slate-900">Weekly Distribution Overview</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Total course load breakdown across operating weekdays
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {days.map((day) => {
              const dayClasses = classes.filter((c) => c.day === day);
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`text-center p-3.5 rounded-xl border transition ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-100'
                      : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{day.slice(0, 3)}</p>
                  <p className="text-2xl font-black text-blue-600 mt-1">{dayClasses.length}</p>
                  <p className="text-[10px] text-slate-500 font-medium">classes</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentTimetableView;
