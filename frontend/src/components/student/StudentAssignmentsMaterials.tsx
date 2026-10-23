import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Calendar,
  FileText,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileUp,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import {
  fetchStudentMaterials,
  fetchStudentAssignments,
  submitStudentAssignment,
} from '../../api/campusApi';
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
  Alert,
  AlertTitle,
  AlertDescription,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Input,
} from '@/components/ui';


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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>('materials');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');

  // Submit Assignment Dialog State
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissionComments, setSubmissionComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = getStoredAuthToken();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      const [materialsResponse, assignmentsResponse] = await Promise.all([
        fetchStudentMaterials(token),
        fetchStudentAssignments(token),
      ]);

      if (materialsResponse.success && Array.isArray(materialsResponse.data)) {
        const materialsData = materialsResponse.data.map((m: any, idx: number) => ({
          id: m.id || idx + 1,
          title: m.title || 'Course Material',
          course: m.course || 'Enrolled Course',
          courseCode: m.course_code || 'N/A',
          type: m.type || 'lecture',
          uploadDate: m.upload_date || new Date().toISOString().split('T')[0],
          downloadCount: m.download_count || 0,
          fileSize: m.file_size || '1.5 MB',
        }));
        setMaterials(materialsData);
      }

      if (assignmentsResponse.success && Array.isArray(assignmentsResponse.data)) {
        const assignmentsData = assignmentsResponse.data.map((a: any, idx: number) => ({
          id: a.id || idx + 1,
          title: a.title || 'Course Assignment',
          course: a.course || 'Enrolled Course',
          courseCode: a.course_code || 'N/A',
          description: a.description || 'No description provided',
          dueDate: a.due_date || new Date().toISOString().split('T')[0],
          submittedDate: a.submitted_date,
          marks: a.marks,
          totalMarks: a.total_marks || 100,
          status: a.status || 'pending',
          faculty: a.faculty || 'Course Faculty',
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

  useEffect(() => {
    loadData();
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'lecture':
        return <Badge variant="info">Lecture Slide</Badge>;
      case 'notes':
        return <Badge variant="success">Study Notes</Badge>;
      case 'reference':
        return <Badge variant="secondary">Reference Paper</Badge>;
      case 'video':
        return <Badge variant="warning">Video Lab</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending Submission</Badge>;
      case 'submitted':
        return <Badge variant="info">Submitted for Review</Badge>;
      case 'graded':
        return <Badge variant="success">Graded & Evaluated</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleOpenSubmitDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSelectedFile(null);
    setSubmissionComments('');
    setSubmitDialogOpen(true);
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedAssignment) return;

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('comments', submissionComments);

      await submitStudentAssignment(token, selectedAssignment.id, formData);

      setSubmitDialogOpen(false);
      setSuccessMessage(`Assignment "${selectedAssignment.title}" submitted successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);

      // Optimistically update assignment status
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === selectedAssignment.id ? { ...a, status: 'submitted', submittedDate: new Date().toISOString() } : a
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to submit assignment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const courses = Array.from(new Set([...materials.map((m) => m.course), ...assignments.map((a) => a.course)]));
  const filteredMaterials =
    filterType === 'all' ? materials : materials.filter((m) => m.type === filterType);
  const filteredAssignments =
    filterCourse === 'all' ? assignments : assignments.filter((a) => a.course === filterCourse);

  const pendingAssignments = assignments.filter((a) => a.status === 'pending');
  const gradedAssignments = assignments.filter((a) => a.status === 'graded');
  const avgGrade = gradedAssignments.length
    ? (gradedAssignments.reduce((sum, a) => sum + (a.marks || 0), 0) / gradedAssignments.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Academic LMS</h2>
          <p className="mt-1 text-xs text-slate-500 font-medium">Loading coursework resources and assignments...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Header */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle size={18} />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="rounded-2xl">
          <CheckCircle2 size={18} />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Coursework & Digital LMS</h2>
          <Badge variant="secondary" className="font-semibold text-xs">
            Academic Portal
          </Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Access course lecture materials, submit required deliverables, and review faculty evaluations
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-gradient-to-br from-amber-50/40 to-white">
          <CardHeader className="p-5 pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Submissions</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-3xl font-extrabold text-amber-950 mt-1">{pendingAssignments.length}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Due within current evaluation window</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-gradient-to-br from-emerald-50/40 to-white">
          <CardHeader className="p-5 pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Graded Deliverables</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-3xl font-extrabold text-emerald-950 mt-1">{gradedAssignments.length}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Evaluated by department faculty</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-gradient-to-br from-purple-50/40 to-white">
          <CardHeader className="p-5 pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Average Score</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-3xl font-extrabold text-purple-950 mt-1">{avgGrade}%</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Cumulative assignment standing</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-xs bg-gradient-to-br from-blue-50/40 to-white">
          <CardHeader className="p-5 pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Repository Materials</span>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-3xl font-extrabold text-blue-950 mt-1">{materials.length}</p>
            <p className="text-[11px] text-slate-500 font-medium mt-1">Available lecture files & references</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Control */}
      <Card className="rounded-2xl border-slate-200/90 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeTab === 'materials' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('materials')}
              className={`rounded-xl text-xs font-bold px-4 ${
                activeTab === 'materials' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <BookOpen size={15} className="mr-2" /> Course Materials ({materials.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'assignments' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('assignments')}
              className={`rounded-xl text-xs font-bold px-4 ${
                activeTab === 'assignments' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <FileText size={15} className="mr-2" /> Assignments & Submissions ({assignments.length})
            </Button>
          </div>

          {/* Contextual Filters */}
          {activeTab === 'materials' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-8 px-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="lecture">Lectures</option>
                <option value="notes">Notes</option>
                <option value="reference">References</option>
                <option value="video">Videos</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Course:</span>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="h-8 px-2.5 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Courses</option>
                {courses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Materials Tab Content */}
      {activeTab === 'materials' && (
        <div className="space-y-3">
          {filteredMaterials.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 p-12 text-center text-slate-500">
              <BookOpen size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800">No course materials found</p>
              <p className="text-xs text-slate-500 mt-1">Faculty uploads will populate here automatically.</p>
            </Card>
          ) : (
            filteredMaterials.map((material) => (
              <Card
                key={material.id}
                className="rounded-2xl border-slate-200/90 shadow-xs hover:border-blue-300 transition-all hover:shadow-md"
              >
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{material.title}</h4>
                        {getTypeBadge(material.type)}
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        {material.courseCode} • {material.course}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                        <span>Uploaded {material.uploadDate}</span>
                        <span>•</span>
                        <span>{material.downloadCount} Downloads</span>
                        <span>•</span>
                        <span>{material.fileSize}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => alert(`Starting download for: ${material.title}`)}
                    className="gap-2 rounded-xl text-xs font-semibold self-start sm:self-auto shrink-0"
                  >
                    <Download size={14} />
                    Download File
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Assignments Tab Content */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {filteredAssignments.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 p-12 text-center text-slate-500">
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-800">No assignments found</p>
              <p className="text-xs text-slate-500 mt-1">You have no active or completed assignments for this course filter.</p>
            </Card>
          ) : (
            filteredAssignments.map((assignment) => {
              const daysLeft = getDaysUntilDue(assignment.dueDate);
              const isOverdue = daysLeft < 0 && assignment.status === 'pending';
              const isUrgent = daysLeft <= 3 && daysLeft >= 0 && assignment.status === 'pending';

              return (
                <Card
                  key={assignment.id}
                  className={`rounded-2xl border transition-all hover:shadow-md ${
                    isOverdue
                      ? 'border-rose-300 bg-rose-50/20'
                      : isUrgent
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-slate-200/90 bg-white'
                  }`}
                >
                  <CardHeader className="p-5 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base font-bold text-slate-900">
                            {assignment.title}
                          </CardTitle>
                          {getStatusBadge(assignment.status)}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {assignment.courseCode} • {assignment.course} • Assigned by {assignment.faculty}
                        </p>
                      </div>

                      <div className="text-right self-start sm:self-auto">
                        <span className="text-xs font-bold text-slate-500">Max Score</span>
                        <p className="text-sm font-extrabold text-slate-900">{assignment.totalMarks} Pts</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-2 space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                      {assignment.description}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</span>
                        <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {assignment.dueDate}
                        </p>
                        <p
                          className={`text-[11px] font-bold mt-0.5 ${
                            isOverdue ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-slate-500'
                          }`}
                        >
                          {isOverdue ? 'Overdue Submission' : daysLeft === 0 ? 'Due Today' : `${daysLeft} days remaining`}
                        </p>
                      </div>

                      {assignment.marks !== undefined && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Awarded Marks</span>
                          <p className="font-black text-emerald-600 text-sm mt-0.5">
                            {assignment.marks} / {assignment.totalMarks}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {((assignment.marks / assignment.totalMarks) * 100).toFixed(0)}% Achievement
                          </p>
                        </div>
                      )}

                      {assignment.submittedDate && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted On</span>
                          <p className="font-semibold text-slate-900 mt-0.5">
                            {new Date(assignment.submittedDate).toLocaleDateString()}
                          </p>
                          <Badge variant="success" className="text-[10px] py-0 px-1.5 mt-0.5">Verified Receipt</Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between gap-3">
                    {assignment.status === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenSubmitDialog(assignment)}
                        className="gap-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Upload size={14} /> Submit Solution File
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-xs font-semibold py-1">
                        <CheckCircle2 size={13} className="text-emerald-500 mr-1.5" />
                        Submission on file
                      </Badge>
                    )}
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* --- Submit Assignment Dialog --- */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileUp size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg">Submit Assignment</DialogTitle>
                <DialogDescription className="text-xs truncate max-w-xs">
                  {selectedAssignment?.title}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitAssignment} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="solution-file" required className="text-xs uppercase tracking-wider text-slate-600">
                Solution File (PDF, ZIP, DOCX)
              </Label>
              <Input
                id="solution-file"
                type="file"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="h-10 text-xs cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="submission-comments" className="text-xs uppercase tracking-wider text-slate-600">
                Notes / Submission Comments
              </Label>
              <textarea
                id="submission-comments"
                rows={3}
                value={submissionComments}
                onChange={(e) => setSubmissionComments(e.target.value)}
                placeholder="Include repository links, execution instructions, or notes for the faculty..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSubmitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !selectedFile}
                className="gap-2"
              >
                {submitting ? 'Uploading...' : 'Confirm Submission'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAssignmentsMaterials;
