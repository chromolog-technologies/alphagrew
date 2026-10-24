import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Award,
  BrainCircuit,
  MessageSquare,
  Loader,
  Send,
  Target,
  Check,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  interviewApi,
  resumeApi,
  type InterviewSession,
  type InterviewTurn,
  type InterviewEvaluation,
  type SkillGapReport,
  type AiRecommendation,
  type ResumeRecord,
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
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

export const StudentAiInterviewView: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [turnSequence, setTurnSequence] = useState<number>(1);
  const [totalTurnsAllowed, setTotalTurnsAllowed] = useState<number>(6);

  // Readiness & Recommendations State
  const [readinessScore, setReadinessScore] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);

  // Interviews State
  const [interviews, setInterviews] = useState<InterviewSession[]>([]);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);

  // New Interview Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newMode, setNewMode] = useState<'technical' | 'hr' | 'resume_deep_dive' | 'system_design' | 'mixed'>('technical');
  const [newRole, setNewRole] = useState('Full Stack Developer');
  const [newLevel, setNewLevel] = useState<'fresher' | 'junior' | 'intermediate'>('fresher');
  const [newDifficulty, setNewDifficulty] = useState<number>(3);
  const [newResumeId, setNewResumeId] = useState<number | null>(null);

  // Active Live Interview Simulator State
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [currentTurn, setCurrentTurn] = useState<InterviewTurn | null>(null);
  const [turnAnswer, setTurnAnswer] = useState('');
  const [answering, setAnswering] = useState(false);

  // Evaluation & Skill Gap Modal State
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<InterviewEvaluation | null>(null);
  const [selectedSkillGap, setSelectedSkillGap] = useState<SkillGapReport | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    const t = getStoredAuthToken();
    setToken(t);
    if (t) {
      loadInitialData(t);
    } else {
      setLoading(false);
      setError('Please sign in to access AI Interview Practice.');
    }
  }, []);

  const loadInitialData = async (authToken: string) => {
    try {
      setLoading(true);
      setError(null);

      const [readinessRes, recsRes, histRes, resumesRes] = await Promise.allSettled([
        interviewApi.getReadinessScore(authToken),
        interviewApi.getRecommendations(authToken),
        interviewApi.history(authToken),
        resumeApi.list(authToken),
      ]);

      if (readinessRes.status === 'fulfilled' && readinessRes.value.data) {
        setReadinessScore(readinessRes.value.data);
      }

      if (recsRes.status === 'fulfilled' && recsRes.value.data) {
        const rawRecs = recsRes.value.data;
        setRecommendations(Array.isArray(rawRecs) ? rawRecs : (rawRecs as any)?.recommendations || []);
      }

      if (histRes.status === 'fulfilled' && histRes.value.data) {
        const rawList = histRes.value.data;
        const list = Array.isArray(rawList) ? rawList : (rawList as any)?.sessions || [];
        setInterviews(list);
      }

      if (resumesRes.status === 'fulfilled' && resumesRes.value.data) {
        const rawResumes = resumesRes.value.data;
        const list = Array.isArray(rawResumes) ? rawResumes : (rawResumes as any)?.resumes || [];
        setResumes(list);
        if (list.length > 0 && !newResumeId) {
          setNewResumeId(list[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load interview readiness state:', err);
      setError('Failed to fetch AI interview configuration. Please check network connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setActionLoading(true);
      setError(null);

      const res = await interviewApi.create(token, {
        mode: newMode,
        targetRole: newRole,
        targetExperienceLevel: newLevel,
        baseDifficulty: newDifficulty,
        resumeId: newResumeId || undefined,
      });

      setShowNewModal(false);
      setSuccessMessage('AI Interview session generated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);

      const created = res.data;
      if (created && created.id) {
        await startInterviewSession(created.id, created);
      } else {
        await loadInitialData(token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start interview.');
    } finally {
      setActionLoading(false);
    }
  };

  const startInterviewSession = async (interviewId: number, sessionData?: InterviewSession) => {
    if (!token) return;

    try {
      setActionLoading(true);
      setError(null);
      const res = await interviewApi.start(token, interviewId);
      const data = res.data;

      if (sessionData) {
        setActiveSession(sessionData);
      } else {
        const found = interviews.find((i) => i.id === interviewId);
        setActiveSession(found || null);
      }

      if (data?.firstTurn) {
        setCurrentTurn(data.firstTurn);
        setTurnSequence(1);
        setTotalTurnsAllowed((data as any)?.totalQuestions || 6);
      }
      setTurnAnswer('');
    } catch (err: any) {
      setError(err.message || 'Failed to start interview turn loop.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnswerTurn = async () => {
    if (!token || !activeSession || !currentTurn || !turnAnswer.trim()) return;

    try {
      setAnswering(true);
      setError(null);

      const answerRes = await interviewApi.answerTurn(
        token,
        activeSession.id,
        currentTurn.id,
        turnAnswer.trim(),
      );

      setTurnAnswer('');

      if (answerRes.data?.isCompleted || !answerRes.data?.nextTurn) {
        await handleFinishSession(activeSession.id, 'completed');
      } else {
        setCurrentTurn(answerRes.data.nextTurn);
        setTurnSequence((prev) => prev + 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer.');
    } finally {
      setAnswering(false);
    }
  };

  const handleFinishSession = async (interviewId: number, reason = 'user_ended') => {
    if (!token) return;

    try {
      setActionLoading(true);
      await interviewApi.finish(token, interviewId, reason);
      setActiveSession(null);
      setCurrentTurn(null);
      setSuccessMessage('Interview completed! Evaluation scorecard generated.');
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadInitialData(token);
      await handleViewEvaluation(interviewId);
    } catch (err: any) {
      setError(err.message || 'Failed to finish interview.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewEvaluation = async (interviewId: number) => {
    if (!token) return;

    try {
      setEvalLoading(true);
      setShowEvalModal(true);
      setSelectedEvaluation(null);
      setSelectedSkillGap(null);

      const [evalRes, gapRes] = await Promise.allSettled([
        interviewApi.getEvaluation(token, interviewId),
        interviewApi.getSkillGap(token, interviewId),
      ]);

      if (evalRes.status === 'fulfilled' && evalRes.value.data) {
        setSelectedEvaluation(evalRes.value.data);
      }

      if (gapRes.status === 'fulfilled' && gapRes.value.data) {
        setSelectedSkillGap(gapRes.value.data);
      }
    } catch (err: any) {
      console.warn('Could not load evaluation:', err);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleUpdateRecommendation = async (recId: number, status: 'open' | 'done' | 'dismissed') => {
    if (!token) return;

    try {
      await interviewApi.updateRecommendation(token, recId, status);
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
      setSuccessMessage(status === 'done' ? 'Recommendation marked as completed!' : 'Recommendation dismissed.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update recommendation.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  // --- Active Interview Simulation Screen ---
  if (activeSession && currentTurn) {
    const turnNumber = turnSequence;
    const totalTurns = totalTurnsAllowed;
    const progressPercent = Math.min(100, Math.round((turnNumber / totalTurns) * 100));

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Active Session Header Card */}
        <Card className="bg-slate-900 text-white rounded-3xl border-slate-800 shadow-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white capitalize">{activeSession.mode.replace('_', ' ')} Interview</h2>
                    <Badge variant="success" className="gap-1 py-0.5 px-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Session
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Target Role: {activeSession.targetRole || 'Software Engineer'}</p>
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleFinishSession(activeSession.id, 'user_cancelled')}
                disabled={actionLoading}
                className="rounded-xl text-xs"
              >
                End Interview Early
              </Button>
            </div>

            {/* Turn Progress */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-medium">
                <span>Question {turnNumber} of {totalTurns}</span>
                <span>{progressPercent}% Complete</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Prompt / Question Card */}
        <Card className="rounded-3xl border-slate-200/90 shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
                <Sparkles size={20} />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                    AI Technical Interviewer
                  </span>
                  {currentTurn.competency && (
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {currentTurn.competency}
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-relaxed">
                  {currentTurn.questionText}
                </h3>
              </div>
            </div>

            {/* Answer Input */}
            <div className="space-y-2 pt-2">
              <Label htmlFor="turn-answer" required className="text-xs uppercase tracking-wider text-slate-600">
                Your Answer / Reasoning
              </Label>
              <textarea
                id="turn-answer"
                rows={6}
                value={turnAnswer}
                onChange={(e) => setTurnAnswer(e.target.value)}
                placeholder="Structure your answer clearly. Explain your thought process, architecture decisions, trade-offs, and concrete examples..."
                className="w-full p-4 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition bg-slate-50/50 hover:bg-white focus:bg-white resize-y"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{turnAnswer.length} characters</span>
                <span>Minimum recommended: 80 characters</span>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={handleAnswerTurn}
                disabled={answering || !turnAnswer.trim()}
                className="rounded-xl px-6 h-11 text-sm font-semibold shadow-md shadow-blue-500/20"
              >
                {answering ? (
                  <>
                    <Loader size={16} className="animate-spin mr-2" />
                    Evaluating answer...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Submit Answer & Next Turn
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main AI Interview & Readiness Dashboard View ---
  const overallScore = readinessScore?.overallScore ?? readinessScore?.score ?? 78;
  const breakdown = readinessScore?.breakdown || {
    profileCompleteness: 85,
    academicStanding: 80,
    interviewPerformance: 70,
    resumeAtsScore: 75,
  };

  return (
    <div className="space-y-8">
      {/* Notifications / Alerts */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle size={18} />
          <AlertTitle>Error</AlertTitle>
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

      {/* 360° Placement Readiness Hub Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div>
            <Badge variant="outline" className="bg-blue-500/20 border-blue-400/30 text-blue-300 gap-1.5 py-1 px-3 text-xs uppercase tracking-wide">
              <BrainCircuit size={14} />
              AI Career Readiness Engine
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-3 leading-tight">
              Master Technical & HR Interviews with Adaptive AI Practice
            </h1>
            <p className="text-slate-300 text-sm mt-3 leading-relaxed max-w-xl">
              Simulate real company hiring rounds, benchmark your answers against target role competencies, identify skill gaps, and raise your placement readiness score.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setShowNewModal(true)}
                className="h-11 px-5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 gap-2"
              >
                <Play size={16} />
                Start AI Mock Interview
              </Button>
              <Button
                variant="outline"
                onClick={() => token && loadInitialData(token)}
                className="h-11 px-4 rounded-xl border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white text-sm font-semibold gap-1.5"
              >
                <RotateCcw size={15} />
                Refresh Scorecard
              </Button>
            </div>
          </div>

          {/* Holistic Readiness Gauge */}
          <Card className="bg-slate-800/80 border-slate-700/80 rounded-2xl backdrop-blur-md text-white">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  360° Placement Readiness
                </CardTitle>
                <Badge
                  variant={overallScore >= 75 ? 'success' : 'warning'}
                  className="text-xs font-bold"
                >
                  {overallScore >= 75 ? 'Ready to Apply' : 'Needs Practice'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{overallScore}</span>
                <span className="text-slate-400 text-sm font-medium">/ 100</span>
              </div>

              {/* Sub-Metric Progress Bars */}
              <div className="space-y-3">
                {[
                  { label: 'Profile Completeness', val: breakdown.profileCompleteness || 80 },
                  { label: 'Academic Standing', val: breakdown.academicStanding || 75 },
                  { label: 'AI Interview Performance', val: breakdown.interviewPerformance || 70 },
                  { label: 'Resume ATS Quality', val: breakdown.resumeAtsScore || 85 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300 mb-1">
                      <span>{item.label}</span>
                      <span>{item.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${item.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Target size={18} className="text-blue-600" />
                Targeted AI Improvement Recommendations
              </h3>
              <p className="text-xs text-slate-500">Curated suggestions derived from your recent interview evaluations and skill gaps</p>
            </div>
            <Badge variant="secondary" className="font-bold">
              {recommendations.length} Active
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => (
              <Card
                key={rec.id}
                className="rounded-2xl border-slate-200/90 shadow-xs hover:border-blue-300 transition flex flex-col justify-between"
              >
                <CardHeader className="p-5 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="info" className="text-[10px] font-bold uppercase">
                      {rec.type || 'Competency'}
                    </Badge>
                    <Badge
                      variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-[10px] font-bold uppercase"
                    >
                      {rec.priority || 'medium'}
                    </Badge>
                  </div>
                  <CardTitle className="font-bold text-slate-900 text-sm">
                    {rec.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-5 pt-0">
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.detail}</p>
                </CardContent>

                <CardFooter className="p-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateRecommendation(rec.id, 'done')}
                    className="h-8 px-2.5 text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 gap-1"
                  >
                    <Check size={14} />
                    Mark Done
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpdateRecommendation(rec.id, 'dismissed')}
                    className="h-8 px-2.5 text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    Dismiss
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mock Interview History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-600" />
              Practice Sessions & Evaluation History
            </h3>
            <p className="text-xs text-slate-500">Review your past mock interviews, scores, and detailed evaluation reports</p>
          </div>
        </div>

        {interviews.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 p-10 text-center text-slate-500">
            <BrainCircuit size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-800">No mock interviews taken yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-5">Start your first AI mock interview to benchmark your placement readiness!</p>
            <div>
              <Button
                onClick={() => setShowNewModal(true)}
                className="gap-2 rounded-xl text-sm font-semibold"
              >
                <Play size={15} />
                Launch First Mock Interview
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70">
                  <TableHead>Session / Mode</TableHead>
                  <TableHead>Target Role</TableHead>
                  <TableHead className="text-center">Difficulty</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interviews.map((item) => {
                  const status = item.status || 'completed';
                  const score = item.overallScore;

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/70 transition">
                      <TableCell>
                        <p className="font-bold text-slate-900 capitalize">{item.mode.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-400">
                          {item.startedAt ? new Date(item.startedAt).toLocaleDateString() : 'Recent'}
                        </p>
                      </TableCell>
                      <TableCell className="text-slate-700 font-medium">
                        {item.targetRole || 'Software Engineer'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          Level {item.baseDifficulty || 3}/5
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={status === 'completed' ? 'success' : 'warning'}
                          className="capitalize"
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {score != null ? (
                          <span className="font-bold text-slate-900 text-sm">{score}/100</span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {status === 'in_progress' ? (
                          <Button
                            size="sm"
                            onClick={() => startInterviewSession(item.id, item)}
                            className="gap-1.5 h-8 text-xs rounded-lg"
                          >
                            <Play size={13} />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEvaluation(item.id)}
                            className="gap-1.5 h-8 text-xs rounded-lg"
                          >
                            <Eye size={13} />
                            Scorecard
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* --- Dialog 1: New Interview Setup --- */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <BrainCircuit size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg">Configure Mock Interview</DialogTitle>
                <DialogDescription className="text-xs">
                  Tailor AI questions to your target industry domain, seniority, and skill depth
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateInterview} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="interview-mode" required className="text-xs uppercase tracking-wider text-slate-600">
                Interview Mode
              </Label>
              <select
                id="interview-mode"
                value={newMode}
                onChange={(e: any) => setNewMode(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="technical">Technical Coding & Concepts</option>
                <option value="hr">Behavioral & HR Round</option>
                <option value="system_design">System Architecture & Design</option>
                <option value="resume_deep_dive">Resume Projects Deep-Dive</option>
                <option value="mixed">Comprehensive Blended Round</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="target-role" required className="text-xs uppercase tracking-wider text-slate-600">
                Target Job Role
              </Label>
              <Input
                id="target-role"
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Full Stack Developer, Data Analyst"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="exp-level" required className="text-xs uppercase tracking-wider text-slate-600">
                  Experience Level
                </Label>
                <select
                  id="exp-level"
                  value={newLevel}
                  onChange={(e: any) => setNewLevel(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="fresher">Fresher (Campus Entry)</option>
                  <option value="junior">Junior (0-2 Yrs)</option>
                  <option value="intermediate">Intermediate (2+ Yrs)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="difficulty" required className="text-xs uppercase tracking-wider text-slate-600">
                  Base Difficulty
                </Label>
                <select
                  id="difficulty"
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(Number(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value={1}>1 - Beginner Fundamentals</option>
                  <option value={2}>2 - Standard Campus Drive</option>
                  <option value={3}>3 - Competitive Tier-1 Drive</option>
                  <option value={4}>4 - High Package / FAANG Level</option>
                  <option value={5}>5 - Advanced Specialist</option>
                </select>
              </div>
            </div>

            {resumes.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="linked-resume" className="text-xs uppercase tracking-wider text-slate-600">
                  Linked Resume (Context for AI)
                </Label>
                <select
                  id="linked-resume"
                  value={newResumeId || ''}
                  onChange={(e) => setNewResumeId(Number(e.target.value) || null)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title || r.fileName} ({r.analysis?.extractedSkills?.length || 0} skills detected)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={actionLoading}
                className="gap-2"
              >
                {actionLoading ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
                Start Interview Session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- Dialog 2: Evaluation & Skill Gap Scorecard --- */}
      <Dialog open={showEvalModal} onOpenChange={setShowEvalModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Award size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg">Interview Evaluation Scorecard</DialogTitle>
                <DialogDescription className="text-xs">
                  Detailed breakdown of answers, competencies, strengths, and role alignment
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {evalLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Loader size={32} className="animate-spin text-blue-600 mx-auto" />
              <p className="text-sm font-medium">Synthesizing scorecard and competency gap analysis...</p>
            </div>
          ) : selectedEvaluation ? (
            <div className="space-y-6 py-2">
              {/* Score Summary Banner */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overall Performance Score</p>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">
                    {selectedEvaluation.overallScore ?? 82} <span className="text-sm font-normal text-slate-500">/ 100</span>
                  </p>
                </div>
                <Badge
                  variant={selectedEvaluation.overallScore >= 75 ? 'success' : selectedEvaluation.overallScore >= 60 ? 'warning' : 'destructive'}
                  className="text-xs font-bold py-1 px-3"
                >
                  {selectedEvaluation.overallScore >= 75 ? 'Distinction' : selectedEvaluation.overallScore >= 60 ? 'Satisfactory' : 'Needs Practice'}
                </Badge>
              </div>

              {/* Dimension Breakdown */}
              {selectedEvaluation.dimensionScores && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                    Competency Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(selectedEvaluation.dimensionScores).map(([key, score]: any) => (
                      <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex justify-between text-xs font-medium text-slate-600 capitalize">
                          <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-bold text-slate-900">{score}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback Notes */}
              {selectedEvaluation.note && (
                <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-4 text-xs leading-relaxed text-blue-900">
                  <p className="font-bold mb-1 flex items-center gap-1.5 text-blue-950">
                    <Sparkles size={14} className="text-blue-600" />
                    Interviewer Evaluation Summary
                  </p>
                  {selectedEvaluation.note}
                </div>
              )}

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedEvaluation.strengths && selectedEvaluation.strengths.length > 0 && (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Demonstrated Strengths
                    </p>
                    <ul className="text-xs text-emerald-950 space-y-1 list-disc list-inside">
                      {selectedEvaluation.strengths.map((str: string, idx: number) => (
                        <li key={idx}>{str}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedEvaluation.weaknesses && selectedEvaluation.weaknesses.length > 0 && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-600" />
                      Areas for Growth
                    </p>
                    <ul className="text-xs text-amber-950 space-y-1 list-disc list-inside">
                      {selectedEvaluation.weaknesses.map((imp: string, idx: number) => (
                        <li key={idx}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Skill Gap Matrix */}
              {selectedSkillGap && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Target Role Skill Gap Matrix ({selectedSkillGap.targetRole || 'Benchmark'})
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    Match Score: {selectedSkillGap.overallMatchPercentage}% • Comparison between role benchmark and demonstrated capability
                  </p>
                  {selectedSkillGap.competencies && selectedSkillGap.competencies.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/70">
                            <TableHead className="p-2.5">Competency</TableHead>
                            <TableHead className="p-2.5">Expected</TableHead>
                            <TableHead className="p-2.5">Demonstrated</TableHead>
                            <TableHead className="p-2.5">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSkillGap.competencies.map((gap, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50/60">
                              <TableCell className="p-2.5 font-medium text-slate-900">{gap.skill}</TableCell>
                              <TableCell className="p-2.5 text-slate-600">{gap.expectedLevel || 'Proficient'}</TableCell>
                              <TableCell className="p-2.5 font-semibold text-slate-800">{gap.demonstratedLevel || 'Needs Polish'}</TableCell>
                              <TableCell className="p-2.5">
                                <Badge
                                  variant={
                                    gap.status === 'exceeds'
                                      ? 'success'
                                      : gap.status === 'meets'
                                      ? 'info'
                                      : gap.status === 'gap'
                                      ? 'warning'
                                      : 'destructive'
                                  }
                                  className="text-[10px] font-bold uppercase"
                                >
                                  {gap.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              Evaluation results are being processed by the asynchronous evaluation pipeline. Please refresh shortly.
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvalModal(false)}>
              Close Scorecard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentAiInterviewView;
