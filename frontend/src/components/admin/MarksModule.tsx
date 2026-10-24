import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Lock,
  Unlock,
  Award,
  BarChart3,
  RefreshCw,
  Send,
  CheckSquare,
  FileText,
  Sliders,
  History,
} from 'lucide-react';
import {
  fetchMarkEntries,
  fetchReviewQueue,
  fetchExamSummary,
  verifyMarkEntry,
  approveMarkEntry,
  rejectMarkEntry,
  bulkApproveMarks,
  fetchPublishingStatus,
  publishSemesterResults,
  unlockSemesterResults,
  fetchPublishingLogs,
  fetchGradeRules,
  setupDefaultGradeRules,
  fetchMarkSchemes,
} from '../../api/campusApi';

const AUTH_KEY = 'chromolog-campus-auth';

function getTokenFromStorage(): string | null {
  const legacyToken = localStorage.getItem('auth_token');
  if (legacyToken) {
    return legacyToken;
  }

  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

export const MarksModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'entries' | 'review' | 'publishing' | 'scales'>('entries');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Data states
  const [entries, setEntries] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<Record<string, number>>({});
  const [gradeRules, setGradeRules] = useState<any[]>([]);
  const [markSchemes, setMarkSchemes] = useState<any[]>([]);

  // Publishing State
  const [selectedSemesterId, setSelectedSemesterId] = useState<number>(1);
  const [publishingReadiness, setPublishingReadiness] = useState<any>(null);
  const [publishingLogs, setPublishingLogs] = useState<any[]>([]);
  const [unlockReason, setUnlockReason] = useState('');
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Review Dialog State
  const [rejectModalData, setRejectModalData] = useState<{ id: number; student: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [verifyModalData, setVerifyModalData] = useState<{ id: number; student: string } | null>(null);
  const [moderationRemarks, setModerationRemarks] = useState('');
  const [extraMarks, setExtraMarks] = useState<string>('0');

  const loadData = useCallback(async () => {
    const token = getTokenFromStorage();
    if (!token) {
      setError('Please sign in to access marks & results.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'entries') {
        const response = await fetchMarkEntries(token, undefined, undefined, filterStatus || undefined);
        const data = response?.data || [];
        setEntries(Array.isArray(data) ? data : []);
      } else if (activeTab === 'review') {
        const response = await fetchReviewQueue(token, undefined, undefined, filterStatus || undefined);
        const data = response?.data || [];
        setReviewQueue(Array.isArray(data) ? data : []);
        if (response?.stats) {
          setReviewStats(response.stats);
        }
      } else if (activeTab === 'publishing') {
        const [statusRes, logsRes] = await Promise.all([
          fetchPublishingStatus(token, selectedSemesterId).catch(() => null),
          fetchPublishingLogs(token, selectedSemesterId).catch(() => null),
        ]);
        if (statusRes?.data) setPublishingReadiness(statusRes.data);
        if (logsRes?.data) setPublishingLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      } else if (activeTab === 'scales') {
        const [rulesRes, schemesRes] = await Promise.all([
          fetchGradeRules(token).catch(() => null),
          fetchMarkSchemes(token).catch(() => null),
        ]);
        if (rulesRes?.data) setGradeRules(Array.isArray(rulesRes.data) ? rulesRes.data : []);
        if (schemesRes?.data) setMarkSchemes(Array.isArray(schemesRes.data) ? schemesRes.data : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch marks data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterStatus, selectedSemesterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalData) return;
    try {
      setActionLoading(true);
      const token = getTokenFromStorage();
      if (!token) return;

      const extra = parseFloat(extraMarks) || 0;
      await verifyMarkEntry(token, verifyModalData.id, {
        remarks: moderationRemarks || 'Verified by department reviewer',
        adjustments: extra > 0 ? { extra_marks: extra } : undefined,
      });

      setSuccessMessage(`Marks for ${verifyModalData.student} verified successfully.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setVerifyModalData(null);
      setModerationRemarks('');
      setExtraMarks('0');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id: number, studentName: string) => {
    try {
      setActionLoading(true);
      const token = getTokenFromStorage();
      if (!token) return;

      await approveMarkEntry(token, id);
      setSuccessMessage(`Marks for ${studentName} approved.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalData) return;
    if (!rejectReason.trim()) {
      setError('A mandatory reason is required to reject marks.');
      return;
    }

    try {
      setActionLoading(true);
      const token = getTokenFromStorage();
      if (!token) return;

      await rejectMarkEntry(token, rejectModalData.id, { remarks: rejectReason });
      setSuccessMessage(`Marks for ${rejectModalData.student} returned to draft.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      setRejectModalData(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishResults = async () => {
    if (!window.confirm(`Are you sure you want to publish Semester ${selectedSemesterId} results? All marks will be locked permanently.`)) {
      return;
    }

    try {
      setActionLoading(true);
      const token = getTokenFromStorage();
      if (!token) return;

      const res = await publishSemesterResults(token, selectedSemesterId);
      setSuccessMessage(res?.message || 'Semester results published and locked successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publishing failed. Ensure all subjects are approved.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockReason.trim()) {
      setError('An audit reason is required to unlock semester results.');
      return;
    }

    try {
      setActionLoading(true);
      const token = getTokenFromStorage();
      if (!token) return;

      await unlockSemesterResults(token, selectedSemesterId, unlockReason);
      setSuccessMessage('Semester marks unlocked for correction.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setShowUnlockModal(false);
      setUnlockReason('');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unlock failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetupDefaultScales = async () => {
    try {
      setActionLoading(true);
      const token = getTokenFromStorage();
      if (!token) return;

      await setupDefaultGradeRules(token);
      setSuccessMessage('Default 10-point scale initialized successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize default scale');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'draft':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'verified':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'approved':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'locked':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case 'O':
      case 'A+':
      case 'A':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'B+':
      case 'B':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C':
      case 'P':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const filteredEntries = entries.filter((e) => {
    const student = e.student?.name || '';
    const roll = e.student?.registrationNumber || e.student?.registration_number || '';
    const subject = e.subject?.name || e.subject?.code || '';
    const matchSearch =
      student.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const filteredQueue = reviewQueue.filter((e) => {
    const student = e.student?.name || '';
    const roll = e.student?.registrationNumber || '';
    const subject = e.subject?.name || '';
    return (
      student.toLowerCase().includes(searchTerm.toLowerCase()) ||
      roll.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Academic Results & Marks Engine</h2>
          <p className="mt-1 text-sm text-slate-600">
            End-to-end marks processing: Faculty Draft → Submission → Department Review → Semester Publishing & Locking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-900 font-bold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('entries')}
          className={`px-4 py-3 font-medium border-b-2 text-sm whitespace-nowrap transition ${
            activeTab === 'entries'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <FileText size={16} />
            Mark Entries
          </span>
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-3 font-medium border-b-2 text-sm whitespace-nowrap transition ${
            activeTab === 'review'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} />
            Department Review Queue
            {reviewQueue.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
                {reviewQueue.length}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('publishing')}
          className={`px-4 py-3 font-medium border-b-2 text-sm whitespace-nowrap transition ${
            activeTab === 'publishing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Lock size={16} />
            Semester Publishing & Locking
          </span>
        </button>
        <button
          onClick={() => setActiveTab('scales')}
          className={`px-4 py-3 font-medium border-b-2 text-sm whitespace-nowrap transition ${
            activeTab === 'scales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Sliders size={16} />
            Grade Scale & Mark Schemes
          </span>
        </button>
      </div>

      {/* TAB 1: MARK ENTRIES */}
      {activeTab === 'entries' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search student, registration #, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Lifecycle States</option>
              <option value="draft">Draft (Faculty Entry)</option>
              <option value="submitted">Submitted (Under Review)</option>
              <option value="verified">Verified (HOD Checked)</option>
              <option value="approved">Approved (Ready to Publish)</option>
              <option value="locked">Locked (Published to Students)</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileText size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-slate-700">No mark entries found matching your criteria</p>
                <p className="text-xs text-slate-400 mt-1">Select an exam and subject in faculty marks entry to begin scoring.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Exam</th>
                      <th className="px-4 py-3 text-right">Internal</th>
                      <th className="px-4 py-3 text-right">External</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEntries.map((row) => {
                      const studentName = row.student?.name || `Student #${row.student_id}`;
                      const regNumber = row.student?.registrationNumber || row.student?.registration_number || 'N/A';
                      const subjectName = row.subject?.name || row.subject?.code || 'Subject';
                      const examName = row.exam?.name || 'Semester Exam';
                      const status = row.status || 'draft';
                      const grade = row.grade || (row.is_absent ? 'Ab' : '-');

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{studentName}</p>
                            <p className="text-xs text-slate-500">{regNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{subjectName}</td>
                          <td className="px-4 py-3 text-slate-600">{examName}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {row.internal_marks ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {row.external_marks ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {row.total_marks ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getGradeBadge(grade)}`}>
                              {grade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(status)}`}>
                              {status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REVIEW QUEUE (HOD / EXAM COORDINATOR) */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          {/* Status Counter Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Submitted (Awaiting Review)', key: 'submitted', color: 'blue' },
              { label: 'Verified (Moderated)', key: 'verified', color: 'purple' },
              { label: 'Approved (Ready to Lock)', key: 'approved', color: 'teal' },
              { label: 'Locked (Published)', key: 'locked', color: 'emerald' },
              { label: 'Draft (Returned to Faculty)', key: 'draft', color: 'amber' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium truncate">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{reviewStats[stat.key] ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 text-sm">Review & Approval Queue</h3>
              <p className="text-xs text-slate-500">HODs verify marks with moderation; Exam Coordinators approve for publishing</p>
            </div>

            {filteredQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2" />
                <p className="font-semibold text-slate-700">All submitted marks have been processed</p>
                <p className="text-xs text-slate-400 mt-1">No marks are currently awaiting verification or approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3 text-right">Score</th>
                      <th className="px-4 py-3 text-center">Grade</th>
                      <th className="px-4 py-3 text-center">State</th>
                      <th className="px-4 py-3 text-right">Lifecycle Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQueue.map((item) => {
                      const studentName = item.student?.name || `Student #${item.student_id}`;
                      const regNumber = item.student?.registrationNumber || '';
                      const subjectName = item.subject?.name || '';
                      const status = item.status || 'submitted';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{studentName}</p>
                            <p className="text-xs text-slate-500">{regNumber}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{subjectName}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {item.total_marks ?? '-'}
                            <span className="text-xs font-normal text-slate-400 ml-1">
                              (Int: {item.internal_marks ?? 0}, Ext: {item.external_marks ?? 0})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getGradeBadge(item.grade)}`}>
                              {item.grade || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(status)}`}>
                              {status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              {status === 'submitted' && (
                                <button
                                  disabled={actionLoading}
                                  onClick={() => setVerifyModalData({ id: item.id, student: studentName })}
                                  className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-xs font-semibold transition"
                                >
                                  Verify / Moderate
                                </button>
                              )}
                              {status === 'verified' && (
                                <button
                                  disabled={actionLoading}
                                  onClick={() => handleApprove(item.id, studentName)}
                                  className="px-2.5 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded text-xs font-semibold transition"
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                disabled={actionLoading}
                                onClick={() => setRejectModalData({ id: item.id, student: studentName })}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded text-xs font-semibold transition"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PUBLISHING & LOCKING (STAGE 5) */}
      {activeTab === 'publishing' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
              <Lock size={18} className="text-blue-600" />
              Semester Result Publishing Gatekeeper
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Per university regulations, semester results are published atomically. Every subject must be approved before publication is permitted.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Target Semester:</label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => loadData()}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Check Readiness
              </button>
            </div>

            {/* Readiness Card */}
            {publishingReadiness && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {publishingReadiness.canPublish ? (
                      <CheckCircle2 size={20} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={20} className="text-amber-600" />
                    )}
                    <span className="font-bold text-slate-900 text-sm">
                      {publishingReadiness.canPublish
                        ? 'All Subjects Approved — Ready to Publish'
                        : 'Publishing Blocked — Pending Subject Approvals'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {publishingReadiness.approvedSubjects ?? 0} of {publishingReadiness.totalSubjects ?? 0} Subjects Approved
                  </span>
                </div>

                {publishingReadiness.pendingSubjects && publishingReadiness.pendingSubjects.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1">Pending Subjects:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {publishingReadiness.pendingSubjects.map((sub: any, idx: number) => (
                        <span key={idx} className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium">
                          {sub.code || sub.name || `Subject #${sub}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    disabled={actionLoading || !publishingReadiness.canPublish}
                    onClick={handlePublishResults}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-semibold flex items-center gap-2 transition"
                  >
                    <Lock size={16} />
                    Publish & Lock Semester Results
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => setShowUnlockModal(true)}
                    className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-semibold flex items-center gap-2 transition"
                  >
                    <Unlock size={16} />
                    Emergency Unlock
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <History size={16} className="text-slate-500" />
              Publishing & Unlock Audit Trail
            </h4>

            {publishingLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No publishing events recorded yet for this semester.</p>
            ) : (
              <div className="space-y-2">
                {publishingLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className={`font-bold uppercase px-2 py-0.5 rounded ${log.action === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {log.action}
                      </span>
                      <span className="text-slate-700 ml-2 font-medium">
                        By {log.publishedBy?.name || 'Administrator'} ({log.entries_count || log.total_students || 0} students)
                      </span>
                      {log.reason && <p className="text-slate-500 mt-1">Reason: {log.reason}</p>}
                    </div>
                    <span className="text-slate-400">{log.created_at || 'Just now'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GRADE SCALE & MARK SCHEMES */}
      {activeTab === 'scales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grade Rules */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Grading Scale (10-Point System)</h3>
                <p className="text-xs text-slate-500">Official percentage to grade letter and grade point mapping</p>
              </div>
              <button
                onClick={handleSetupDefaultScales}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
              >
                Reset Default Scale
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Point</th>
                    <th className="px-3 py-2">Score Range</th>
                    <th className="px-3 py-2">Classification</th>
                    <th className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="px-3 py-2 font-bold text-slate-900">{rule.grade}</td>
                      <td className="px-3 py-2 text-slate-700">{rule.grade_point}</td>
                      <td className="px-3 py-2 text-slate-600">{rule.min_score}% – {rule.max_score}%</td>
                      <td className="px-3 py-2 text-slate-600">{rule.description || 'Standard'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${rule.is_pass ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {rule.is_pass ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mark Schemes */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Subject Mark Schemes</h3>
              <p className="text-xs text-slate-500">Internal, external, and pass criteria by subject and semester</p>
            </div>

            {markSchemes.length === 0 ? (
              <p className="text-xs text-slate-500">No subject mark schemes configured yet.</p>
            ) : (
              <div className="space-y-2">
                {markSchemes.map((scheme) => (
                  <div key={scheme.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{scheme.subject?.name || `Subject #${scheme.subject_id}`}</p>
                      <p className="text-slate-500">Semester {scheme.semester?.semester_number || scheme.semester_id}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800">
                        Int: {scheme.internal_max} | Ext: {scheme.external_max} | Total: {scheme.total_max}
                      </span>
                      <p className="text-slate-400">Pass: {scheme.total_pass} marks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VERIFY MODERATION MODAL */}
      {verifyModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleVerify} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">HOD Verification & Moderation</h3>
            <p className="text-sm text-slate-600">
              Verify scores for <strong>{verifyModalData.student}</strong>. You may apply moderation marks if permitted.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Moderation Extra Marks (Optional)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={extraMarks}
                onChange={(e) => setExtraMarks(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Review Remarks</label>
              <textarea
                required
                rows={3}
                placeholder="e.g., Verified against lab record; +2 moderation applied for question anomaly"
                value={moderationRemarks}
                onChange={(e) => setModerationRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVerifyModalData(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Confirm Verification'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleReject} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg text-rose-600">Reject Mark Entry</h3>
            <p className="text-sm text-slate-600">
              Return marks for <strong>{rejectModalData.student}</strong> back to faculty draft for correction.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mandatory Rejection Remarks *</label>
              <textarea
                required
                rows={3}
                placeholder="State the reason for returning these marks to the instructor..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalData(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject to Draft'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UNLOCK MODAL */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleUnlockResults} className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg text-amber-600">Emergency Semester Unlock</h3>
            <p className="text-sm text-slate-600">
              Unlocking Semester {selectedSemesterId} results will revert locked marks to approved status. An audit log will be created.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Reason for Unlock *</label>
              <textarea
                required
                rows={3}
                placeholder="Mandatory justification (e.g., Academic council revision of external scores)..."
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? 'Unlocking...' : 'Confirm Unlock'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

