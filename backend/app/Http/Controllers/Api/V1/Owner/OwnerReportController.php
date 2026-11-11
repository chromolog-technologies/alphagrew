<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\ExportJob;
use App\Models\ReportSchedule;
use App\Models\SavedReport;
use App\Services\Audit\AuditLogger;
use App\Services\Owner\ReportBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Analytics & Reporting hub covering all 11 SRS §13 report definitions,
 * saved views, scheduled deliveries, and immutable ExportJob audit logging (SRS §5.15).
 */
class OwnerReportController extends Controller
{
    public function __construct(
        private readonly ReportBuilder $builder,
        private readonly AuditLogger $audit,
    ) {
    }

    public function catalog(): JsonResponse
    {
        return response()->json([
            'data' => collect(ReportBuilder::REPORTS)->map(fn (array $meta, string $key) => [
                'key' => $key,
                'label' => $meta['label'],
                'description' => $meta['description'],
            ])->values(),
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'reportKey' => ['required', Rule::in(array_keys(ReportBuilder::REPORTS))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'institutionId' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', 'max:40'],
        ]);

        return response()->json(['data' => $this->builder->build($filters['reportKey'], $filters)]);
    }

    public function export(Request $request): StreamedResponse|\Illuminate\Http\Response
    {
        $filters = $request->validate([
            'reportKey' => ['required', Rule::in(array_keys(ReportBuilder::REPORTS))],
            'format' => ['nullable', Rule::in(['csv', 'html'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'institutionId' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', 'max:40'],
        ]);

        $format = $filters['format'] ?? 'csv';
        $report = $this->builder->build($filters['reportKey'], $filters, 2000);
        $stamp = now()->format('Ymd-His');
        $ext = $format === 'html' ? 'html' : 'csv';
        $filename = "alphagrew-{$report['key']}-{$stamp}.{$ext}";

        ExportJob::query()->create([
            'report_key' => $report['key'],
            'format' => $format,
            'filters' => array_diff_key($filters, ['reportKey' => true, 'format' => true]),
            'row_count' => count($report['rows']),
            'status' => 'completed',
            'actor_id' => $request->user()?->id,
            'file_name' => $filename,
            'exported_at' => now(),
        ]);

        $this->audit->record('owner.report_exported', null, [], [
            'reportKey' => $report['key'],
            'format' => $format,
            'rows' => count($report['rows']),
        ], $request->user());

        if ($format === 'html') {
            $html = $this->renderPrintableHtml($report, $request->user()?->name ?? 'Platform Owner');

            return response($html, 200, [
                'Content-Type' => 'text/html; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        return response()->streamDownload(function () use ($report): void {
            $out = fopen('php://output', 'wb');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $report['columns']);
            foreach ($report['rows'] as $row) {
                fputcsv($out, array_map([$this, 'csvSafe'], $row));
            }
            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function savedIndex(): JsonResponse
    {
        $items = SavedReport::query()->with('creator:id,name')->latest('id')->get()->map(fn (SavedReport $r) => [
            'id' => $r->id,
            'name' => $r->name,
            'reportKey' => $r->report_key,
            'filters' => $r->filters ?? [],
            'format' => $r->format,
            'createdBy' => $r->creator?->name,
            'lastRunAt' => $r->last_run_at?->toIso8601String(),
            'createdAt' => $r->created_at?->toIso8601String(),
        ]);

        return response()->json(['data' => $items]);
    }

    public function saveReport(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'reportKey' => ['required', Rule::in(array_keys(ReportBuilder::REPORTS))],
            'filters' => ['nullable', 'array'],
            'format' => ['sometimes', Rule::in(['csv', 'html'])],
        ]);

        $saved = SavedReport::query()->create([
            'name' => $data['name'],
            'report_key' => $data['reportKey'],
            'filters' => $data['filters'] ?? [],
            'format' => $data['format'] ?? 'csv',
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => [
            'id' => $saved->id, 'name' => $saved->name, 'reportKey' => $saved->report_key, 'filters' => $saved->filters ?? [], 'format' => $saved->format,
        ]], 201);
    }

    public function deleteSavedReport(SavedReport $savedReport): JsonResponse
    {
        $savedReport->delete();

        return response()->json(['message' => 'Saved report deleted.']);
    }

    public function schedulesIndex(): JsonResponse
    {
        $items = ReportSchedule::query()->with('creator:id,name')->latest('id')->get()->map(fn (ReportSchedule $s) => [
            'id' => $s->id,
            'name' => $s->name,
            'reportKey' => $s->report_key,
            'filters' => $s->filters ?? [],
            'frequency' => $s->frequency,
            'format' => $s->format,
            'recipients' => $s->recipients,
            'isActive' => $s->is_active,
            'nextRunAt' => $s->next_run_at?->toIso8601String(),
            'lastRunAt' => $s->last_run_at?->toIso8601String(),
            'createdBy' => $s->creator?->name,
        ]);

        return response()->json(['data' => $items]);
    }

    public function storeSchedule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'reportKey' => ['required', Rule::in(array_keys(ReportBuilder::REPORTS))],
            'filters' => ['nullable', 'array'],
            'frequency' => ['required', Rule::in(ReportSchedule::FREQUENCIES)],
            'format' => ['sometimes', Rule::in(['csv', 'html'])],
            'recipients' => ['required', 'array', 'min:1', 'max:20'],
            'recipients.*' => ['email'],
        ]);

        $nextRun = match ($data['frequency']) {
            'daily' => now()->addDay()->startOfDay(),
            'monthly' => now()->addMonth()->startOfMonth(),
            default => now()->addWeek()->startOfDay(),
        };

        $schedule = ReportSchedule::query()->create([
            'name' => $data['name'],
            'report_key' => $data['reportKey'],
            'filters' => $data['filters'] ?? [],
            'frequency' => $data['frequency'],
            'format' => $data['format'] ?? 'csv',
            'recipients' => $data['recipients'],
            'is_active' => true,
            'next_run_at' => $nextRun,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['data' => ['id' => $schedule->id, 'name' => $schedule->name, 'isActive' => $schedule->is_active]], 201);
    }

    public function updateSchedule(Request $request, ReportSchedule $reportSchedule): JsonResponse
    {
        $data = $request->validate(['isActive' => ['sometimes', 'boolean'], 'frequency' => ['sometimes', Rule::in(ReportSchedule::FREQUENCIES)]]);
        $reportSchedule->update([
            ...(array_key_exists('isActive', $data) ? ['is_active' => $data['isActive']] : []),
            ...(isset($data['frequency']) ? ['frequency' => $data['frequency']] : []),
        ]);

        return response()->json(['data' => ['id' => $reportSchedule->id, 'isActive' => $reportSchedule->is_active]]);
    }

    public function deleteSchedule(ReportSchedule $reportSchedule): JsonResponse
    {
        $reportSchedule->delete();

        return response()->json(['message' => 'Schedule removed.']);
    }

    public function exportsIndex(): JsonResponse
    {
        $items = ExportJob::query()->with('actor:id,name')->latest('exported_at')->latest('id')->limit(100)->get()->map(fn (ExportJob $job) => [
            'id' => $job->id,
            'reportKey' => $job->report_key,
            'format' => $job->format,
            'rowCount' => $job->row_count,
            'status' => $job->status,
            'fileName' => $job->file_name,
            'actor' => $job->actor?->name,
            'exportedAt' => $job->exported_at?->toIso8601String(),
        ]);

        return response()->json(['data' => $items]);
    }

    private function csvSafe(mixed $value): string
    {
        $text = (string) ($value ?? '');
        if ($text !== '' && in_array($text[0], ['=', '+', '-', '@'], true)) {
            return "'{$text}";
        }

        return $text;
    }

    /** @param array{key: string, label: string, columns: list<string>, rows: list<list<mixed>>} $report */
    private function renderPrintableHtml(array $report, string $actorName): string
    {
        $head = collect($report['columns'])->map(fn (string $c) => '<th>'.e($c).'</th>')->implode('');
        $body = collect($report['rows'])->map(fn (array $row) => '<tr>'.collect($row)->map(fn ($v) => '<td>'.e((string) ($v ?? '—')).'</td>')->implode('').'</tr>')->implode('');
        $generated = now()->format('Y-m-d H:i:s');

        return <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{$report['label']}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}h1{font-size:20px;margin:0 0 4px}p{color:#64748b;font-size:12px;margin:0 0 16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#f1f5f9}</style>
</head><body><h1>{$report['label']}</h1><p>Generated by {$actorName} on {$generated}</p><table><thead><tr>{$head}</tr></thead><tbody>{$body}</tbody></table></body></html>
HTML;
    }
}

