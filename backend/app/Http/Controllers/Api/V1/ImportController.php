<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Imports\BulkImporter;
use App\Support\Campus\CampusPermission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * POST /imports/{students|staff}: upload a CSV (field "file"); "dryRun=1" checks it without
 * saving. GET /imports/{type}/template downloads the expected header.
 * Students need students.create; staff accounts are admin-only, like the Staff screen.
 */
class ImportController extends Controller
{
    public function __construct(private readonly BulkImporter $importer) {}

    public function students(Request $request): JsonResponse
    {
        abort_unless($request->user()->can(CampusPermission::STUDENTS_CREATE), 403, 'You cannot add students.');
        $rows = $this->importer->parse($this->file($request));

        return response()->json(['data' => $this->importer->students($rows, $request->user(), $request->boolean('dryRun'))]);
    }

    public function staff(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403, 'Only admins can import staff accounts.');
        $rows = $this->importer->parse($this->file($request));

        return response()->json(['data' => $this->importer->staff($rows, $request->user(), $request->boolean('dryRun'))]);
    }

    public function template(string $type): StreamedResponse
    {
        $columns = match ($type) {
            'students' => BulkImporter::STUDENT_COLUMNS,
            'staff' => BulkImporter::STAFF_COLUMNS,
            default => abort(404),
        };
        $example = match ($type) {
            'students' => ['Asha Menon', 'asha@example.com', 'CSE', 'year_1', 'female', '9876543210', '0', '0', 'pending'],
            default => ['Ravi Kumar', 'ravi@example.com', 'CSE', 'Assistant Professor', 'staff', '9876543210'],
        };

        return response()->streamDownload(function () use ($columns, $example): void {
            $out = fopen('php://output', 'w');
            fputcsv($out, $columns);
            fputcsv($out, $example);
            fclose($out);
        }, "{$type}-import-template.csv", ['Content-Type' => 'text/csv']);
    }

    private function file(Request $request): \Illuminate\Http\UploadedFile
    {
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        return $request->file('file');
    }
}
