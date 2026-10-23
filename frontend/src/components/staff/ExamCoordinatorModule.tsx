import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Clock, MapPin, FileText } from 'lucide-react';
import { fetchExams, createExam, assignExamInvigilators, assignExamClassrooms } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';
import { PrototypeNotice } from '../shared';

interface ExamSchedule {
  id: number;
  examName: string;
  courseCode: string;
  courseName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  hallAllocations: number;
  totalStudents: number;
  status: 'scheduled' | 'ongoing' | 'completed';
}

interface HallAllocation {
  id: number;
  hallName: string;
  hallCode: string;
  capacity: number;
  assignedStudents: number;
  assignedExams: number;
}

interface ResultsPublished {
  id: number;
  examName: string;
  totalStudents: number;
  publishedCount: number;
  pendingCount: number;
  publishDate: string;
}

export const ExamCoordinatorModule: React.FC = () => {
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [halls, setHalls] = useState<HallAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = getStoredToken();
        if (!token) {
          setError('Authentication token not found');
          return;
        }

        const response = await fetchExams(token);
        if (response?.data) {
          const examsList = Array.isArray(response.data) ? response.data : 
            response.data.exams || [];
          setExams(examsList);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch exam data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const [resultsPublished, setResultsPublished] = useState<ResultsPublished[]>([
    {
      id: 1,
      examName: 'Data Structures',
      totalStudents: 120,
      publishedCount: 85,
      pendingCount: 35,
      publishDate: '2025-03-31',
    },
    {
      id: 2,
      examName: 'Web Development',
      totalStudents: 60,
      publishedCount: 60,
      pendingCount: 0,
      publishDate: '2025-03-28',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'exams' | 'halls' | 'results'>('exams');
  const [isAddingExam, setIsAddingExam] = useState(false);

  const getStatusColor = (status: string) => {
    if (status === 'scheduled') return 'bg-blue-100 text-blue-800';
    if (status === 'ongoing') return 'bg-orange-100 text-orange-800';
    if (status === 'completed') return 'bg-green-100 text-green-800';
    return 'bg-slate-100 text-slate-800';
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const upcomingExams = exams.filter((e) => e.status !== 'completed');
  const completedExams = exams.filter((e) => e.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading exam data...</p>
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

  const examCoordinatorStats = [
    { label: 'Upcoming Exams', value: upcomingExams.length, color: 'blue' },
    { label: 'Exam Halls', value: halls.length, color: 'purple' },
    { label: 'Total Exams', value: exams.length, color: 'green' },
    { label: 'Completed', value: completedExams.length, color: 'orange' },
  ];

  return (
    <div className="space-y-6">
      <PrototypeNotice />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Exam Coordination</h2>
        <p className="mt-1 text-sm text-slate-600">Manage exam schedules, halls, and result publishing</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {examCoordinatorStats.map((stat, idx) => (
          <div key={idx} className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-sm text-slate-600 font-medium">{stat.label}</p>
            <p className={`text-3xl font-bold mt-2 text-${stat.color}-600`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'exams'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Calendar size={18} />
            Exam Schedules
          </span>
        </button>
        <button
          onClick={() => setActiveTab('halls')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'halls'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <MapPin size={18} />
            Hall Allocation
          </span>
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'results'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText size={18} />
            Results Publishing
          </span>
        </button>
      </div>

      {/* Exams Tab */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <button
            onClick={() => setIsAddingExam(!isAddingExam)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Schedule Exam
          </button>

          {isAddingExam && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold text-blue-900 mb-4">Schedule New Exam</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Exam Name" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" placeholder="Course Code" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="text" placeholder="Course Name" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="date" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="time" placeholder="Start Time" className="px-3 py-2 border border-slate-300 rounded-lg" />
                <input type="time" placeholder="End Time" className="px-3 py-2 border border-slate-300 rounded-lg" />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Schedule</button>
                <button
                  onClick={() => setIsAddingExam(false)}
                  className="px-4 py-2 bg-slate-300 text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">Upcoming Exams</h4>
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-bold text-slate-900 text-lg">{exam.examName}</h5>
                      <p className="text-sm text-slate-600 mt-1">
                        {exam.courseCode} - {exam.courseName}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(exam.status)}`}>
                      {getStatusLabel(exam.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span>
                        <p className="text-xs text-slate-600">Date</p>
                        <p className="font-semibold text-slate-900">{exam.examDate}</p>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <span>
                        <p className="text-xs text-slate-600">Time</p>
                        <p className="font-semibold text-slate-900">{exam.startTime}</p>
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Halls</p>
                      <p className="font-semibold text-slate-900">{exam.hallAllocations}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Students</p>
                      <p className="font-semibold text-blue-600">{exam.totalStudents}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm flex items-center justify-center gap-2">
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">
                      Allocate Halls
                    </button>
                    <button
                      onClick={() => setExams(exams.filter((e) => e.id !== exam.id))}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {completedExams.length > 0 && (
            <div className="space-y-2 mt-6 pt-6 border-t border-slate-200">
              <h4 className="font-bold text-slate-900">Completed Exams</h4>
              <div className="space-y-2">
                {completedExams.map((exam) => (
                  <div key={exam.id} className="bg-green-50 border border-green-200 rounded p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{exam.examName}</p>
                      <p className="text-sm text-slate-600">{exam.examDate}</p>
                    </div>
                    <span className="text-sm font-semibold px-3 py-1 rounded-full bg-green-100 text-green-800">Completed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hall Allocation Tab */}
      {activeTab === 'halls' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Drag exams to halls to allocate. Each hall has a specified capacity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {halls.map((hall) => (
              <div key={hall.id} className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-bold text-slate-900">{hall.hallName}</h5>
                    <p className="text-sm text-slate-600">Code: {hall.hallCode}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-slate-200 text-slate-800">Capacity: {hall.capacity}</span>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-sm text-slate-600">Assigned Students</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(hall.assignedStudents / hall.capacity) * 100}%` }}
                        />
                      </div>
                      <p className="font-bold text-slate-900">
                        {hall.assignedStudents}/{hall.capacity}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Assigned Exams: {hall.assignedExams}</p>
                  </div>
                </div>

                <button className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm">
                  View Allocations
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>Publish Results:</strong> Review and publish exam results for each exam. Results can only be published after all marks are entered.
            </p>
          </div>

          <div className="space-y-3">
            {resultsPublished.map((result) => (
              <div key={result.id} className="border border-slate-200 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <h5 className="font-bold text-slate-900 text-lg">{result.examName}</h5>
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-green-100 text-green-800">Published</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-slate-600">Total Students</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{result.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Published</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{result.publishedCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Pending</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{result.pendingCount}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-600">Publication Progress</span>
                    <span className="text-sm font-bold text-slate-900">
                      {((result.publishedCount / result.totalStudents) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all"
                      style={{ width: `${(result.publishedCount / result.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>

                <button className="w-full px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium">
                  Publish Remaining Results
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-bold text-slate-900 mb-3">Publish New Results</h4>
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded">
                  <div>
                    <p className="font-semibold text-slate-900">{exam.examName}</p>
                    <p className="text-sm text-slate-600">{exam.totalStudents} students</p>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Publish Results</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
