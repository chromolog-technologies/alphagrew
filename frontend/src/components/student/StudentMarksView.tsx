import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Filter, 
  Loader, 
  AlertCircle, 
  Award, 
  CheckCircle2, 
  BookOpen, 
  Calendar, 
  GraduationCap, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { 
  fetchStudentMarks, 
  fetchStudentAllResults, 
  fetchStudentSemesterGradeCard 
} from '../../api/campusApi';
import { getStoredAuthToken } from '../../utils/auth';


interface ExamMark {
  id: number;
  exam: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  date: string;
}

interface SubjectPerformance {
  subject: string;
  exams: number;
  averagePercentage: number;
  bestGrade: string;
  status: 'excellent' | 'good' | 'average' | 'needs-improvement';
}

interface PublishedSemester {
  id: number;
  name: string;
  academicYear?: string;
  sgpa: number | null;
  totalCredits: number;
  creditsEarned: number;
  resultStatus: string;
  publishedAt?: string;
}

interface AcademicSummary {
  cgpa: number | null;
  activeBacklogs: number;
  backlogHistory: number;
  attendancePercentage: number | null;
  subjectsPublished: number;
  semestersPublished: number;
  source: string;
  calculatedAt?: string;
}

interface GradeCardSubject {
  code: string;
  name: string;
  credits: number;
  internalMarks: number | null;
  externalMarks: number | null;
  extraMarks: number | null;
  totalMarks: number | null;
  grade: string | null;
  gradePoint: number | null;
  status: string;
}

interface GradeCardData {
  semester: {
    id: number;
    name: string;
    academicYear?: string;
  };
  sgpa: number | null;
  totalCredits: number;
  creditsEarned: number;
  resultStatus: string;
  publishedAt?: string;
  subjects: GradeCardSubject[];
}

const AUTH_KEY = 'chromolog-campus-auth';


function getTokenFromStorage(): string | null {
  return getStoredAuthToken();
}

export const StudentMarksView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'official' | 'assessment'>('official');

  // Official Results State (Stage 6)
  const [publishedSemesters, setPublishedSemesters] = useState<PublishedSemester[]>([]);
  const [academicSummary, setAcademicSummary] = useState<AcademicSummary | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | null>(null);
  const [gradeCard, setGradeCard] = useState<GradeCardData | null>(null);
  const [loadingOfficial, setLoadingOfficial] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);

  // Assessment Marks State
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [performance, setPerformance] = useState<SubjectPerformance[]>([]);
  const [loadingAssessment, setLoadingAssessment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [filterExam, setFilterExam] = useState<string | null>(null);
  const [overallPercentage, setOverallPercentage] = useState<string>('0');

  useEffect(() => {
    loadOfficialResults();
    loadAssessmentMarks();
  }, []);

  const loadOfficialResults = async () => {
    const token = getTokenFromStorage();
    if (!token) return;

    try {
      setLoadingOfficial(true);
      const res = await fetchStudentAllResults(token);
      if (res.data) {
        const sems = res.data.semesters || [];
        setPublishedSemesters(sems);
        setAcademicSummary(res.data.summary || null);

        if (sems.length > 0) {
          const firstId = sems[0].id;
          setSelectedSemesterId(firstId);
          await loadGradeCard(token, firstId);
        }
      }
    } catch (err: any) {
      console.warn('Could not load official student results:', err.message);
    } finally {
      setLoadingOfficial(false);
    }
  };

  const loadGradeCard = async (token: string, semesterId: number) => {
    try {
      setLoadingCard(true);
      const res = await fetchStudentSemesterGradeCard(token, semesterId);
      if (res.data) {
        setGradeCard(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch semester grade card:', err.message);
      setGradeCard(null);
    } finally {
      setLoadingCard(false);
    }
  };

  const handleSelectSemester = async (id: number) => {
    setSelectedSemesterId(id);
    const token = getTokenFromStorage();
    if (token) {
      await loadGradeCard(token, id);
    }
  };

  const loadAssessmentMarks = async () => {
    try {
      setLoadingAssessment(true);
      setError(null);

      const token = getTokenFromStorage();
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      const marksResponse = await fetchStudentMarks(token);

      const allMarks = marksResponse?.data?.all_marks;
      if (marksResponse.success && Array.isArray(allMarks)) {
        const marksData = allMarks.map((mark: any) => ({
          id: mark.id,
          exam: mark.exam || 'Unknown Exam',
          subject: mark.subject || 'Unknown Subject',
          marksObtained: mark.marks_obtained || 0,
          totalMarks: mark.total_marks || 100,
          percentage: mark.percentage || 0,
          grade: mark.grade || 'F',
          date: mark.date || new Date().toISOString().split('T')[0],
        }));
        setMarks(marksData);
        
        const overall = marksResponse?.data?.overall_percentage;
        setOverallPercentage(typeof overall === 'number' ? overall.toFixed(1) : '0');
      }

      const subjectPerformance = marksResponse?.data?.subject_performance;
      if (marksResponse.success && Array.isArray(subjectPerformance)) {
        const perfData = subjectPerformance.map((item: any) => {
          const avgPercentage = item.average_percentage || 0;
          let status: 'excellent' | 'good' | 'average' | 'needs-improvement' = 'needs-improvement';
          if (avgPercentage >= 90) status = 'excellent';
          else if (avgPercentage >= 75) status = 'good';
          else if (avgPercentage >= 60) status = 'average';

          return {
            subject: item.subject_name || 'Unknown Subject',
            exams: item.exams_taken || 0,
            averagePercentage: avgPercentage,
            bestGrade: item.best_grade || 'F',
            status,
          };
        });
        setPerformance(perfData);
      }
    } catch (err: any) {
      console.error('Failed to fetch marks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load marks data.');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'bg-slate-100 text-slate-700';
    switch (grade.toUpperCase()) {
      case 'O':
      case 'A+':
        return 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border border-emerald-300';
      case 'A':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'B+':
      case 'B':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'C':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'P':
        return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      default:
        return 'bg-rose-100 text-rose-800 border border-rose-200';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  const filteredMarks = marks.filter(
    (m) => (!filterSubject || m.subject === filterSubject) && (!filterExam || m.exam === filterExam)
  );

  const exams = [...new Set(marks.map((m) => m.exam))];
  const subjects = [...new Set(marks.map((m) => m.subject))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="text-indigo-600" size={28} />
            Academic Results & Marks
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Official semester grade cards, CGPA summary, and continuous assessment breakdown
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('official')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'official'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={16} />
            Official Grade Cards
          </button>
          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'assessment'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={16} />
            Class Tests & Exams
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-rose-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-rose-900">Notification</h4>
            <p className="text-sm text-rose-800 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* TAB 1: OFFICIAL GRADE CARDS & CGPA SUMMARY (Stage 6) */}
      {activeTab === 'official' && (
        <div className="space-y-6">
          {/* Cumulative Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between opacity-80 mb-2">
                <span className="text-xs font-semibold tracking-wider uppercase">Cumulative CGPA</span>
                <Award size={20} />
              </div>
              <div className="text-3xl font-extrabold">
                {academicSummary?.cgpa !== null && academicSummary?.cgpa !== undefined
                  ? Number(academicSummary.cgpa).toFixed(2)
                  : 'N/A'}
                <span className="text-sm font-normal opacity-75"> / 10.0</span>
              </div>
              <p className="text-xs opacity-80 mt-2 flex items-center gap-1">
                <CheckCircle2 size={12} />
                {academicSummary?.source === 'results' ? 'Calculated from published results' : 'Official institution record'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-wider uppercase">Active Backlogs</span>
                <AlertCircle size={20} className={academicSummary?.activeBacklogs ? 'text-amber-500' : 'text-emerald-500'} />
              </div>
              <div className={`text-3xl font-extrabold ${academicSummary?.activeBacklogs ? 'text-amber-600' : 'text-emerald-600'}`}>
                {academicSummary?.activeBacklogs ?? 0}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {academicSummary?.activeBacklogs === 0 ? 'Clear academic standing' : 'Pending re-appear papers'}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-wider uppercase">Semesters Published</span>
                <BookOpen size={20} className="text-indigo-500" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {academicSummary?.semestersPublished ?? publishedSemesters.length}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Across {academicSummary?.subjectsPublished ?? 0} locked subjects
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-wider uppercase">Placement Status</span>
                <TrendingUp size={20} className="text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-slate-900 mt-1">
                {(academicSummary?.cgpa ?? 0) >= 6.0 && (academicSummary?.activeBacklogs ?? 0) === 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                    <CheckCircle2 size={14} /> Eligible (0 Backlogs)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                    Criteria Check Req.
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Syncs with campus recruitment drives
              </p>
            </div>
          </div>

          {/* Published Semesters Selector */}
          {loadingOfficial ? (
            <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
              <Loader className="animate-spin text-indigo-600 mr-2" size={24} />
              <span className="text-sm font-medium text-slate-600">Loading published results...</span>
            </div>
          ) : publishedSemesters.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <FileText className="mx-auto text-slate-400 mb-3" size={40} />
              <h3 className="text-base font-semibold text-slate-800">No Published Grade Cards Yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                Official semester grade cards become available once the department examination authority publishes the final semester results.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Semester Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                {publishedSemesters.map((sem) => {
                  const isSelected = sem.id === selectedSemesterId;
                  return (
                    <button
                      key={sem.id}
                      onClick={() => handleSelectSemester(sem.id)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Calendar size={14} />
                      {sem.name}
                      {sem.sgpa !== null && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-800'
                        }`}>
                          SGPA {Number(sem.sgpa).toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Detailed Grade Card */}
              {loadingCard ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-slate-200">
                  <Loader className="animate-spin text-indigo-600 mr-2" size={24} />
                  <span className="text-sm font-medium text-slate-600">Retrieving semester grade card...</span>
                </div>
              ) : gradeCard ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Grade Card Banner */}
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">{gradeCard.semester.name}</h3>
                        {gradeCard.semester.academicYear && (
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                            {gradeCard.semester.academicYear}
                          </span>
                        )}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          gradeCard.resultStatus === 'pass' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {gradeCard.resultStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Official Locked Record • Published on {gradeCard.publishedAt ? new Date(gradeCard.publishedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-slate-500 text-xs block">Semester SGPA</span>
                        <span className="text-2xl font-black text-indigo-700">
                          {gradeCard.sgpa !== null ? Number(gradeCard.sgpa).toFixed(2) : 'N/A'}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-slate-200" />
                      <div>
                        <span className="text-slate-500 text-xs block">Credits Earned / Total</span>
                        <span className="text-base font-bold text-slate-900">
                          {gradeCard.creditsEarned} <span className="text-slate-400 font-normal">/ {gradeCard.totalCredits}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grade Card Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Subject Code</th>
                          <th className="px-4 py-3 text-left font-semibold">Subject Name</th>
                          <th className="px-4 py-3 text-center font-semibold">Credits</th>
                          <th className="px-4 py-3 text-right font-semibold">Internal</th>
                          <th className="px-4 py-3 text-right font-semibold">External</th>
                          <th className="px-4 py-3 text-right font-semibold">Total</th>
                          <th className="px-4 py-3 text-center font-semibold">Grade</th>
                          <th className="px-4 py-3 text-center font-semibold">Grade Point</th>
                          <th className="px-4 py-3 text-center font-semibold">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {gradeCard.subjects && gradeCard.subjects.length > 0 ? (
                          gradeCard.subjects.map((sub, i) => (
                            <tr key={i} className="hover:bg-slate-50/80 transition">
                              <td className="px-4 py-3 font-mono font-medium text-slate-900 text-xs">
                                {sub.code}
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {sub.name}
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600">
                                {sub.credits}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700">
                                {sub.internalMarks ?? '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700">
                                {sub.externalMarks ?? '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {sub.totalMarks ?? '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${getGradeColor(sub.grade)}`}>
                                  {sub.grade ?? '-'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-bold text-slate-800">
                                {sub.gradePoint !== null ? Number(sub.gradePoint).toFixed(1) : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  sub.status === 'PASS' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                                }`}>
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                              No subject entries available for this semester.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONTINUOUS ASSESSMENT & CLASS TESTS */}
      {activeTab === 'assessment' && (
        <div className="space-y-6">
          {/* Overall Performance Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Internal Assessment Average</p>
                <p className="mt-2 text-4xl font-extrabold text-blue-900">{overallPercentage}%</p>
                <p className="mt-2 text-sm text-blue-700">
                  Across <strong>{marks.length}</strong> recorded assessment tests
                </p>
              </div>
              <BarChart3 size={48} className="text-blue-300 opacity-80" />
            </div>
          </div>

          {/* Subject-wise Performance */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Subject-wise Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {performance.map((perf, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-slate-900">{perf.subject}</h4>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {perf.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Exams Taken:</span>
                      <span className="font-semibold text-slate-900">{perf.exams}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Average:</span>
                      <span className={`font-bold ${getPercentageColor(perf.averagePercentage)}`}>
                        {perf.averagePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Best Grade:</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-xs ${getGradeColor(perf.bestGrade)}`}>
                        {perf.bestGrade}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <Filter size={16} /> Filter Marks
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={filterExam || ''}
                onChange={(e) => setFilterExam(e.target.value || null)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Exams</option>
                {exams.map((exam) => (
                  <option key={exam} value={exam}>
                    {exam}
                  </option>
                ))}
              </select>
              <select
                value={filterSubject || ''}
                onChange={(e) => setFilterSubject(e.target.value || null)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Marks Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Exam</th>
                  <th className="px-4 py-3 text-left font-semibold">Subject</th>
                  <th className="px-4 py-3 text-right font-semibold">Marks</th>
                  <th className="px-4 py-3 text-right font-semibold">%</th>
                  <th className="px-4 py-3 text-center font-semibold">Grade</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredMarks.length > 0 ? (
                  filteredMarks.map((mark) => (
                    <tr key={mark.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 text-slate-900 font-medium">{mark.exam}</td>
                      <td className="px-4 py-3 text-slate-600">{mark.subject}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-semibold">
                        {mark.marksObtained}/{mark.totalMarks}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${getPercentageColor(mark.percentage)}`}>
                        {mark.percentage}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${getGradeColor(mark.grade)}`}>
                          {mark.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{mark.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No assessment marks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

