import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, Clock, Loader2 } from 'lucide-react';
import { examApi } from '../../api/apiClient';

interface Exam {
  id: number;
  name: string;
  course: string;
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  room: string;
  status: 'scheduled' | 'ongoing' | 'completed';
}

export const ExamsModule: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([
    {
      id: 1,
      name: 'Mid Semester - 1',
      course: 'B.TECH CSE',
      subject: 'Database Management',
      examDate: '2026-04-15',
      startTime: '10:00',
      endTime: '12:00',
      totalMarks: 50,
      room: 'Hall-1',
      status: 'scheduled',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    examApi
      .list()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setExams(
            data.map((item: any, idx: number) => ({
              id: item.id || idx + 1,
              name: item.name || `Exam #${item.id}`,
              course: item.course?.name || item.course_name || 'B.Tech CSE',
              subject: item.subject?.name || item.subject_name || 'Database Systems',
              examDate: item.exam_date || item.start_date || '2026-04-15',
              startTime: item.start_time || '10:00',
              endTime: item.end_time || '12:00',
              totalMarks: item.max_marks || item.total_marks || 100,
              room: item.room || 'Hall-1',
              status: item.status || 'scheduled',
            }))
          );
        }
      })
      .catch(() => {
        // Keeps initial demo data in offline mode or if unauthorized
      })
      .finally(() => setLoading(false));
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    course: '',
    subject: '',
    examDate: '',
    startTime: '',
    endTime: '',
    totalMarks: 100,
    room: '',
  });

  const filteredExams = exams.filter(
    (exam) =>
      exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddExam = () => {
    if (formData.name && formData.examDate) {
      setExams([
        ...exams,
        {
          id: exams.length + 1,
          ...formData,
          status: 'scheduled',
        },
      ]);
      setFormData({ name: '', course: '', subject: '', examDate: '', startTime: '', endTime: '', totalMarks: 100, room: '' });
      setShowForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Exams Management</h2>
          <p className="mt-1 text-sm text-slate-600">Schedule and manage exams</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Schedule Exam
        </button>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search exams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Schedule New Exam</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Exam Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Course"
              value={formData.course}
              onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={formData.examDate}
              onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Total Marks"
              value={formData.totalMarks}
              onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Hall/Room"
              value={formData.room}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddExam} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Schedule
            </button>
            <button onClick={() => setShowForm(false)} className="bg-slate-300 text-slate-900 px-4 py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Exam Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Subject</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Time</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Room</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Marks</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredExams.map((exam) => (
              <tr key={exam.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900 font-medium">{exam.name}</td>
                <td className="px-4 py-3 text-slate-600">{exam.subject}</td>
                <td className="px-4 py-3 text-slate-600 flex items-center gap-1">
                  <Calendar size={14} /> {exam.examDate}
                </td>
                <td className="px-4 py-3 text-slate-600 flex items-center gap-1">
                  <Clock size={14} /> {exam.startTime} - {exam.endTime}
                </td>
                <td className="px-4 py-3 text-slate-600">{exam.room}</td>
                <td className="px-4 py-3 text-slate-600">{exam.totalMarks}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(exam.status)}`}>
                    {exam.status}
                  </span>
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button className="text-blue-600 hover:text-blue-700">
                    <Edit2 size={16} />
                  </button>
                  <button className="text-red-600 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
