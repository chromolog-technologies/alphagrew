import React, { useState, useEffect } from 'react';
import { Download, Upload, Calendar, FileText, BookOpen, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import { fetchStudentMaterials, fetchStudentAssignments } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';
import { PrototypeNotice } from '../shared';


interface Material {
  id: number;
  title: string;
  course: string;
  courseCode: string;
  type: 'lecture' | 'notes' | 'reference' | 'video';
  uploadDate: string;
  downloadCount: number;
  fileSize: string;
}

interface Assignment {
  id: number;
  title: string;
  course: string;
  courseCode: string;
  description: string;
  dueDate: string;
  submittedDate?: string;
  marks?: number;
  totalMarks: number;
  status: 'pending' | 'submitted' | 'graded';
  faculty: string;
}

export const StudentAssignmentsMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>('materials');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getStoredToken();
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }

        // Fetch materials and assignments
        const [materialsResponse, assignmentsResponse] = await Promise.all([
          fetchStudentMaterials(token),
          fetchStudentAssignments(token),
        ]);

        // Format materials data
        if (materialsResponse.success && Array.isArray(materialsResponse.data)) {
          const materialsData = materialsResponse.data.map((m: any, idx: number) => ({
            id: idx + 1,
            title: m.title || 'Unknown Material',
            course: m.course || 'Unknown Course',
            courseCode: m.course_code || 'N/A',
            type: m.type || 'lecture',
            uploadDate: m.upload_date || new Date().toISOString().split('T')[0],
            downloadCount: m.download_count || 0,
            fileSize: m.file_size || '0 MB',
          }));
          setMaterials(materialsData);
        }

        // Format assignments data
        if (assignmentsResponse.success && Array.isArray(assignmentsResponse.data)) {
          const assignmentsData = assignmentsResponse.data.map((a: any, idx: number) => ({
            id: idx + 1,
            title: a.title || 'Unknown Assignment',
            course: a.course || 'Unknown Course',
            courseCode: a.course_code || 'N/A',
            description: a.description || 'No description provided',
            dueDate: a.due_date || new Date().toISOString().split('T')[0],
            submittedDate: a.submitted_date,
            marks: a.marks,
            totalMarks: a.total_marks || 100,
            status: a.status || 'pending',
            faculty: a.faculty || 'Faculty',
          }));
          setAssignments(assignmentsData);
        }
      } catch (err) {
        console.error('Failed to fetch materials/assignments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load materials and assignments. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture':
        return <BookOpen size={18} className="text-blue-600" />;
      case 'notes':
        return <FileText size={18} className="text-green-600" />;
      case 'reference':
        return <FileText size={18} className="text-purple-600" />;
      case 'video':
        return <BookOpen size={18} className="text-orange-600" />;
      default:
        return <FileText size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'graded':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />;
      case 'submitted':
        return <CheckCircle size={16} />;
      case 'graded':
        return <CheckCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const courses = Array.from(new Set(materials.map((m) => m.course)));
  const filteredMaterials =
    filterType === 'all'
      ? materials
      : materials.filter((m) => m.type === filterType);

  const filteredAssignments =
    filterCourse === 'all'
      ? assignments
      : assignments.filter((a) => a.course === filterCourse);

  const pendingAssignments = assignments.filter((a) => a.status === 'pending');
  const gradedAssignments = assignments.filter((a) => a.status === 'graded');
  const avgGrade = gradedAssignments.length
    ? (gradedAssignments.reduce((sum, a) => sum + (a.marks || 0), 0) / gradedAssignments.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assignments & Materials</h2>
          <p className="mt-1 text-sm text-slate-600">Loading your materials and assignments...</p>
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
          <h2 className="text-2xl font-bold text-slate-900">Assignments & Materials</h2>
          <p className="mt-1 text-sm text-slate-600">Download course materials and submit assignments</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-900">Error Loading Materials</h4>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PrototypeNotice />
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Assignments & Materials</h2>
        <p className="mt-1 text-sm text-slate-600">Download course materials and submit assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium">Pending Assignments</p>
          <p className="text-3xl font-bold text-blue-900 mt-2">{pendingAssignments.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">Graded Assignments</p>
          <p className="text-3xl font-bold text-green-900 mt-2">{gradedAssignments.length}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-700 font-medium">Average Grade</p>
          <p className="text-3xl font-bold text-purple-900 mt-2">{avgGrade}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-700 font-medium">Course Materials</p>
          <p className="text-3xl font-bold text-orange-900 mt-2">{materials.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('materials')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'materials'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Course Materials
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'assignments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Assignments
        </button>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="lecture">Lectures</option>
                <option value="notes">Notes</option>
                <option value="reference">Reference</option>
                <option value="video">Videos</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="border border-slate-200 rounded-lg p-5 hover:shadow-md transition bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="mt-1">{getTypeIcon(material.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-lg truncate">{material.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm font-semibold text-blue-600">{material.courseCode}</span>
                        <span className="text-sm text-slate-600">{material.course}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                        <span>📅 {material.uploadDate}</span>
                        <span>📥 {material.downloadCount} downloads</span>
                        <span>📦 {material.fileSize}</span>
                      </div>
                    </div>
                  </div>
                  <button className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium">
                    <Download size={16} />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredAssignments.map((assignment) => {
              const daysLeft = getDaysUntilDue(assignment.dueDate);
              const isOverdue = daysLeft < 0 && assignment.status === 'pending';
              const isUrgent = daysLeft <= 3 && daysLeft > 0 && assignment.status === 'pending';

              return (
                <div
                  key={assignment.id}
                  className={`border rounded-lg p-5 transition ${
                    isOverdue
                      ? 'border-red-300 bg-red-50'
                      : isUrgent
                        ? 'border-orange-300 bg-orange-50'
                        : 'border-slate-200 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-lg">{assignment.title}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-sm font-semibold text-blue-600">{assignment.courseCode}</span>
                        <span className="text-sm text-slate-600">{assignment.course}</span>
                        <span className="text-xs text-slate-500">by {assignment.faculty}</span>
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(
                        assignment.status,
                      )}`}
                    >
                      {getStatusIcon(assignment.status)}
                      {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 mb-3">{assignment.description}</p>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-slate-600">Due Date</p>
                      <p className="font-semibold text-slate-900">{assignment.dueDate}</p>
                      <p
                        className={`text-xs mt-1 font-bold ${
                          isOverdue
                            ? 'text-red-600'
                            : isUrgent
                              ? 'text-orange-600'
                              : 'text-slate-600'
                        }`}
                      >
                        {isOverdue
                          ? `${Math.abs(daysLeft)} days overdue`
                          : daysLeft < 0
                            ? 'Overdue'
                            : `${daysLeft} days left`}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Total Marks</p>
                      <p className="font-bold text-slate-900">{assignment.totalMarks}</p>
                    </div>
                    {assignment.marks !== undefined && (
                      <div>
                        <p className="text-slate-600">Your Marks</p>
                        <p className="font-bold text-green-600">{assignment.marks}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {((assignment.marks / assignment.totalMarks) * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {assignment.status === 'pending' && (
                      <>
                        <button className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium flex items-center justify-center gap-2">
                          <Upload size={16} />
                          Submit Assignment
                        </button>
                        <button className="px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm">
                          View Details
                        </button>
                      </>
                    )}
                    {assignment.status === 'submitted' && (
                      <>
                        <button className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm">
                          Submitted
                        </button>
                        <button className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
                          View Submission
                        </button>
                      </>
                    )}
                    {assignment.status === 'graded' && (
                      <>
                        <button className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">
                          Graded
                        </button>
                        <button className="px-3 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 text-sm">
                          View Feedback
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
