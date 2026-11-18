<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\AiInterview;
use App\Models\AiResumeAnalysis;
use App\Models\Institution;
use App\Models\JobApplication;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Cross-tenant product oversight (SRS §5.10–§5.14).
 * Strictly read-only and aggregated: never exposes raw resumes, transcripts, audio files, or marks mutation.
 */
class OwnerOversightController extends Controller
{
    /** GET /owner/oversight/academic (SRS §5.10) */
    public function academic(Request $request): JsonResponse
    {
        $institutionId = $this->institutionFilter($request);
        $institutions = Institution::query()
            ->when($institutionId, fn ($q) => $q->where('id', $institutionId))
            ->orderBy('name')->get(['id', 'code', 'name', 'status']);

        $campuses = DB::table('campuses')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $departments = DB::table('departments')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $courses = DB::table('courses')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $batches = DB::table('batches')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $academicYears = DB::table('academic_years')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $semesters = DB::table('semesters')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $students = DB::table('students')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');

        $rows = $institutions->map(function (Institution $i) use ($campuses, $departments, $courses, $batches, $academicYears, $semesters, $students) {
            $c = (int) ($campuses[$i->id] ?? 0);
            $d = (int) ($departments[$i->id] ?? 0);
            $co = (int) ($courses[$i->id] ?? 0);
            $b = (int) ($batches[$i->id] ?? 0);
            $ay = (int) ($academicYears[$i->id] ?? 0);
            $sem = (int) ($semesters[$i->id] ?? 0);
            $pillars = ($c > 0 ? 1 : 0) + ($d > 0 ? 1 : 0) + ($co > 0 ? 1 : 0) + ($b > 0 ? 1 : 0) + ($ay > 0 ? 1 : 0);

            return [
                'institutionId' => $i->id,
                'code' => $i->code,
                'name' => $i->name,
                'status' => $i->status,
                'campuses' => $c,
                'departments' => $d,
                'courses' => $co,
                'batches' => $b,
                'academicYears' => $ay,
                'semesters' => $sem,
                'students' => (int) ($students[$i->id] ?? 0),
                'completenessPercent' => (int) round(($pillars / 5) * 100),
            ];
        })->values();

        return response()->json([
            'data' => [
                'totals' => [
                    'institutions' => $rows->count(),
                    'campuses' => $rows->sum('campuses'),
                    'departments' => $rows->sum('departments'),
                    'courses' => $rows->sum('courses'),
                    'batches' => $rows->sum('batches'),
                    'academicYears' => $rows->sum('academicYears'),
                    'semesters' => $rows->sum('semesters'),
                    'students' => $rows->sum('students'),
                ],
                'institutions' => $rows,
            ],
        ]);
    }

    /** GET /owner/oversight/placement (SRS §5.11) */
    public function placement(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'institutionId' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);
        $institutionId = isset($filters['institutionId']) ? (int) $filters['institutionId'] : null;
        $from = isset($filters['from']) ? Carbon::parse($filters['from'])->startOfDay() : now()->subYear()->startOfDay();
        $to = isset($filters['to']) ? Carbon::parse($filters['to'])->endOfDay() : now()->endOfDay();

        $companies = DB::table('companies')->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))->count();
        $drives = DB::table('placement_drives')->whereNull('deleted_at')->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))->count();
        $postings = DB::table('job_postings')->whereNull('deleted_at')->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))->count();

        $apps = JobApplication::query()->withoutGlobalScopes()
            ->whereBetween('applied_at', [$from, $to])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->get(['institution_id', 'status', 'offer_ctc_lpa']);

        $offers = $apps->whereIn('status', ['offered', 'accepted']);
        $accepted = $apps->where('status', 'accepted');
        $ctcValues = $offers->pluck('offer_ctc_lpa')->filter(fn ($v) => $v !== null);

        $institutions = Institution::query()->when($institutionId, fn ($q) => $q->where('id', $institutionId))->orderBy('name')->get(['id', 'code', 'name']);
        $companyByInst = DB::table('companies')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $driveByInst = DB::table('placement_drives')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $appsByInst = $apps->groupBy('institution_id');

        $rows = $institutions->map(function (Institution $i) use ($appsByInst, $companyByInst, $driveByInst) {
            $group = $appsByInst->get($i->id, collect());
            $instAccepted = $group->where('status', 'accepted')->count();
            $instOffers = $group->whereIn('status', ['offered', 'accepted'])->count();
            $avg = $group->whereIn('status', ['offered', 'accepted'])->whereNotNull('offer_ctc_lpa')->avg('offer_ctc_lpa');

            return [
                'institutionId' => $i->id,
                'code' => $i->code,
                'name' => $i->name,
                'companies' => (int) ($companyByInst[$i->id] ?? 0),
                'drives' => (int) ($driveByInst[$i->id] ?? 0),
                'applications' => $group->count(),
                'shortlisted' => $group->where('status', 'shortlisted')->count(),
                'offers' => $instOffers,
                'accepted' => $instAccepted,
                'avgCtcLpa' => $avg ? round((float) $avg, 2) : 0,
            ];
        })->values();

        return response()->json([
            'data' => [
                'totals' => [
                    'companies' => $companies,
                    'drives' => $drives,
                    'jobPostings' => $postings,
                    'applications' => $apps->count(),
                    'shortlisted' => $apps->where('status', 'shortlisted')->count(),
                    'offers' => $offers->count(),
                    'placements' => $accepted->count(),
                    'placementRatePercent' => $apps->count() > 0 ? round($accepted->count() / $apps->count() * 100, 1) : 0,
                    'avgCtcLpa' => $ctcValues->isNotEmpty() ? round((float) $ctcValues->avg(), 2) : 0,
                    'maxCtcLpa' => $ctcValues->isNotEmpty() ? round((float) $ctcValues->max(), 2) : 0,
                ],
                'institutions' => $rows,
            ],
        ]);
    }

    /** GET /owner/oversight/assessments (SRS §5.12 — strictly read-only aggregates) */
    public function assessments(Request $request): JsonResponse
    {
        $institutionId = $this->institutionFilter($request);

        $examsQuery = DB::table('exams')->whereNull('deleted_at')->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId));
        $examCounts = (clone $examsQuery)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $markSummary = DB::table('mark_entries')->whereNull('deleted_at')
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw("count(*) as total, sum(case when result = 'PASS' then 1 else 0 end) as passed, sum(case when is_absent = 1 then 1 else 0 end) as absent, coalesce(avg(total_marks), 0) as avg_marks")
            ->first();
        $semSummary = DB::table('semester_results')
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw('count(*) as total, coalesce(avg(percentage), 0) as avg_pct')
            ->first();

        $institutions = Institution::query()->when($institutionId, fn ($q) => $q->where('id', $institutionId))->orderBy('name')->get(['id', 'code', 'name']);
        $examsByInst = DB::table('exams')->whereNull('deleted_at')->selectRaw('institution_id, count(*) as total')->groupBy('institution_id')->pluck('total', 'institution_id');
        $marksByInst = DB::table('mark_entries')->whereNull('deleted_at')
            ->selectRaw("institution_id, count(*) as total, sum(case when result = 'PASS' then 1 else 0 end) as passed")
            ->groupBy('institution_id')->get()->keyBy('institution_id');

        $totalMarks = (int) ($markSummary->total ?? 0);
        $passedMarks = (int) ($markSummary->passed ?? 0);

        return response()->json([
            'data' => [
                'readOnlyNotice' => 'Platform owner oversight exposes cross-tenant aggregates only; grading rules and marks remain institution-managed.',
                'totals' => [
                    'exams' => (int) $examCounts->sum(),
                    'scheduled' => (int) ($examCounts['scheduled'] ?? 0),
                    'ongoing' => (int) ($examCounts['ongoing'] ?? 0),
                    'completed' => (int) ($examCounts['completed'] ?? 0),
                    'markEntries' => $totalMarks,
                    'absentEntries' => (int) ($markSummary->absent ?? 0),
                    'passRatePercent' => $totalMarks > 0 ? round($passedMarks / $totalMarks * 100, 1) : 0,
                    'avgMarks' => round((float) ($markSummary->avg_marks ?? 0), 1),
                    'avgSemesterPercentage' => round((float) ($semSummary->avg_pct ?? 0), 1),
                ],
                'institutions' => $institutions->map(function (Institution $i) use ($examsByInst, $marksByInst) {
                    $m = $marksByInst->get($i->id);
                    $entries = (int) ($m->total ?? 0);
                    $passed = (int) ($m->passed ?? 0);

                    return [
                        'institutionId' => $i->id,
                        'code' => $i->code,
                        'name' => $i->name,
                        'exams' => (int) ($examsByInst[$i->id] ?? 0),
                        'markEntries' => $entries,
                        'passRatePercent' => $entries > 0 ? round($passed / $entries * 100, 1) : 0,
                    ];
                })->values(),
            ],
        ]);
    }

    /** GET /owner/oversight/resumes (SRS §5.13 — aggregated health & skill trends, zero resume files/PII) */
    public function resumes(Request $request): JsonResponse
    {
        $institutionId = $this->institutionFilter($request);

        $statuses = Resume::query()->withoutGlobalScopes()
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $analyses = AiResumeAnalysis::query()->withoutGlobalScopes()
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw('count(*) as total, coalesce(avg(overall_score), 0) as avg_overall, coalesce(avg(ats_compatibility_score), 0) as avg_ats')
            ->first();
        $aiLogs = DB::table('ai_usage_logs')
            ->whereIn('feature', ['resume_parse', 'resume_analysis', 'skill_gap'])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw("count(*) as calls, sum(case when status = 'success' then 0 else 1 end) as failures, coalesce(avg(latency_ms), 0) as avg_latency, coalesce(sum(estimated_cost_usd), 0) as cost_usd")
            ->first();

        $institutions = Institution::query()->when($institutionId, fn ($q) => $q->where('id', $institutionId))->orderBy('name')->get(['id', 'code', 'name']);
        $resumesByInst = Resume::query()->withoutGlobalScopes()
            ->selectRaw("institution_id, count(*) as total, sum(case when status = 'parsed' then 1 else 0 end) as parsed, sum(case when status = 'failed' then 1 else 0 end) as failed")
            ->groupBy('institution_id')->get()->keyBy('institution_id');
        $analysesByInst = AiResumeAnalysis::query()->withoutGlobalScopes()
            ->selectRaw('institution_id, count(*) as total, coalesce(avg(overall_score), 0) as avg_overall, coalesce(avg(ats_compatibility_score), 0) as avg_ats')
            ->groupBy('institution_id')->get()->keyBy('institution_id');

        return response()->json([
            'data' => [
                'privacyNotice' => 'Raw student resumes and parsed PII are never exposed in owner oversight; aggregates only.',
                'totals' => [
                    'uploads' => (int) $statuses->sum(),
                    'parsed' => (int) ($statuses['parsed'] ?? 0),
                    'failed' => (int) ($statuses['failed'] ?? 0),
                    'analyses' => (int) ($analyses->total ?? 0),
                    'avgOverallScore' => round((float) ($analyses->avg_overall ?? 0), 1),
                    'avgAtsScore' => round((float) ($analyses->avg_ats ?? 0), 1),
                    'aiCalls' => (int) ($aiLogs->calls ?? 0),
                    'aiFailures' => (int) ($aiLogs->failures ?? 0),
                    'avgLatencyMs' => (int) round((float) ($aiLogs->avg_latency ?? 0)),
                    'estimatedCostUsd' => round((float) ($aiLogs->cost_usd ?? 0), 2),
                ],
                'institutions' => $institutions->map(function (Institution $i) use ($resumesByInst, $analysesByInst) {
                    $r = $resumesByInst->get($i->id);
                    $a = $analysesByInst->get($i->id);

                    return [
                        'institutionId' => $i->id,
                        'code' => $i->code,
                        'name' => $i->name,
                        'uploads' => (int) ($r->total ?? 0),
                        'parsed' => (int) ($r->parsed ?? 0),
                        'failed' => (int) ($r->failed ?? 0),
                        'analyses' => (int) ($a->total ?? 0),
                        'avgOverallScore' => round((float) ($a->avg_overall ?? 0), 1),
                        'avgAtsScore' => round((float) ($a->avg_ats ?? 0), 1),
                    ];
                })->values(),
            ],
        ]);
    }

    /** GET /owner/oversight/interviews (SRS §5.14 — aggregates & assistive disclaimer only) */
    public function interviews(Request $request): JsonResponse
    {
        $institutionId = $this->institutionFilter($request);

        $byStatus = AiInterview::query()->withoutGlobalScopes()
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $byMode = AiInterview::query()->withoutGlobalScopes()
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw('mode, count(*) as total')->groupBy('mode')->pluck('total', 'mode');
        $eval = DB::table('ai_interview_evaluations')
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw('count(*) as total, coalesce(avg(overall_score), 0) as avg_score')->first();
        $aiLogs = DB::table('ai_usage_logs')
            ->whereIn('feature', ['interview_plan', 'interview_question', 'interview_evaluate', 'speech_to_text'])
            ->when($institutionId, fn ($q) => $q->where('institution_id', $institutionId))
            ->selectRaw("count(*) as calls, sum(case when status = 'success' then 0 else 1 end) as failures, coalesce(avg(latency_ms), 0) as avg_latency, coalesce(sum(estimated_cost_usd), 0) as cost_usd")
            ->first();

        $institutions = Institution::query()->when($institutionId, fn ($q) => $q->where('id', $institutionId))->orderBy('name')->get(['id', 'code', 'name']);
        $sessionsByInst = AiInterview::query()->withoutGlobalScopes()
            ->selectRaw("institution_id, count(*) as total, sum(case when status = 'completed' then 1 else 0 end) as completed, sum(case when status = 'failed' then 1 else 0 end) as failed")
            ->groupBy('institution_id')->get()->keyBy('institution_id');
        $evalsByInst = DB::table('ai_interview_evaluations')
            ->selectRaw('institution_id, count(*) as total, coalesce(avg(overall_score), 0) as avg_score')
            ->groupBy('institution_id')->get()->keyBy('institution_id');

        return response()->json([
            'data' => [
                'disclaimer' => 'AI interview evaluations are assistive readiness signals only and must not serve as autonomous hiring or academic exclusion decisions. Audio and transcripts remain private to the tenant.',
                'totals' => [
                    'sessions' => (int) $byStatus->sum(),
                    'completed' => (int) ($byStatus['completed'] ?? 0),
                    'inProgress' => (int) ($byStatus['in_progress'] ?? 0),
                    'failed' => (int) ($byStatus['failed'] ?? 0),
                    'abandoned' => (int) ($byStatus['abandoned'] ?? 0),
                    'evaluated' => (int) ($eval->total ?? 0),
                    'avgScore' => round((float) ($eval->avg_score ?? 0), 1),
                    'aiCalls' => (int) ($aiLogs->calls ?? 0),
                    'aiFailures' => (int) ($aiLogs->failures ?? 0),
                    'avgLatencyMs' => (int) round((float) ($aiLogs->avg_latency ?? 0)),
                    'estimatedCostUsd' => round((float) ($aiLogs->cost_usd ?? 0), 2),
                ],
                'byMode' => $byMode,
                'institutions' => $institutions->map(function (Institution $i) use ($sessionsByInst, $evalsByInst) {
                    $s = $sessionsByInst->get($i->id);
                    $e = $evalsByInst->get($i->id);

                    return [
                        'institutionId' => $i->id,
                        'code' => $i->code,
                        'name' => $i->name,
                        'sessions' => (int) ($s->total ?? 0),
                        'completed' => (int) ($s->completed ?? 0),
                        'failed' => (int) ($s->failed ?? 0),
                        'evaluated' => (int) ($e->total ?? 0),
                        'avgScore' => round((float) ($e->avg_score ?? 0), 1),
                    ];
                })->values(),
            ],
        ]);
    }

    private function institutionFilter(Request $request): ?int
    {
        $id = $request->validate(['institutionId' => ['nullable', 'integer']])['institutionId'] ?? null;

        return $id ? (int) $id : null;
    }
}

