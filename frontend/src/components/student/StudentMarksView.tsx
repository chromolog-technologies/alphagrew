import React, { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Filter, Loader, AlertCircle } from 'lucide-react';
import { fetchStudentMarks } from '../../api/campusApi';
import { getStoredToken } from '../../api/apiClient';

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

function getTokenFromStorage(): string | null {
  return getStoredToken();
}

export const StudentMarksView: React.FC = () => {
  const [marks, setMarks] = useState<ExamMark[]>([]);
  const [performance, setPerformance] = useState<SubjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [filterExam, setFilterExam] = useState<string | null>(null);
  const [overallPercentage, setOverallPercentage] = useState<string>('0');

  useEffect(() => {
    const fetchMarksData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getTokenFromStorage();
        if (!token) {
          setError('Authentication required. Please log in.');
          return;
        }

        const marksResponse = await fetchStudentMarks(token);

        // Format marks data
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
      } catch (err) {
        console.error('Failed to fetch marks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load marks data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMarksData();
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800';
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
        return '⭐⭐⭐';
      case 'good':
        return '⭐⭐';
      case 'average':
        return '⭐';
      default:
        return '⚠️';
    }
  };

  const filteredMarks = marks.filter(
    (m) => (!filterSubject || m.subject === filterSubject) && (!filterExam || m.exam === filterExam)
  );

  const exams = [...new Set(marks.map((m) => m.exam))];
  const subjects = [...new Set(marks.map((m) => m.subject))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Marks & Results</h2>
          <p className="mt-1 text-sm text-slate-600">View your exam marks and overall performance</p>
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
          <h2 className="text-2xl font-bold text-slate-900">Marks & Results</h2>
          <p className="mt-1 text-sm text-slate-600">View your exam marks and overall performance</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-semibold text-red-900">Error Loading Marks</h4>
            <p className="text-sm text-red-800 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Marks & Results</h2>
        <p className="mt-1 text-sm text-slate-600">View your exam marks and overall performance</p>
      </div>

      {/* Overall Performance Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900 uppercase">Overall Performance</p>
            <p className="mt-2 text-4xl font-bold text-blue-900">{overallPercentage}%</p>
            <p className="mt-2 text-sm text-blue-700">
              Across <strong>{marks.length}</strong> exams
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
              className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="font-semibold text-slate-900">{perf.subject}</h4>
                <span className="text-lg">{getStatusIcon(perf.status)}</span>
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
                  <span className={`font-bold px-2 py-1 rounded text-xs ${getGradeColor(perf.bestGrade)}`}>
                    {perf.bestGrade}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Filter size={18} /> Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={filterExam || ''}
            onChange={(e) => setFilterExam(e.target.value || null)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Exam</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Subject</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Marks</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">%</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">Grade</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredMarks.length > 0 ? (
              filteredMarks.map((mark) => (
                <tr key={mark.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900 font-medium">{mark.exam}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{mark.subject}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-900 font-semibold">
                    {mark.marksObtained}/{mark.totalMarks}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-bold ${getPercentageColor(mark.percentage)}`}>
                    {mark.percentage}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${getGradeColor(mark.grade)}`}>
                      {mark.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{mark.date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No marks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
