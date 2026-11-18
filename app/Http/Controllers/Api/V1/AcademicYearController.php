<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Academic years of the institution. One year is active at a time; a year with semesters
 * cannot be deleted (semesters, exams and results hang off it).
 */
class AcademicYearController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function index(): JsonResponse
    {
        $years = AcademicYear::query()->withCount('semesters')->orderByDesc('start_date')->get();

        return response()->json(['data' => $years->map(fn (AcademicYear $year) => $this->present($year))->all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $year = DB::transaction(function () use ($data): AcademicYear {
            $year = AcademicYear::query()->create($data);
            $this->keepSingleActive($year);

            return $year;
        });
        $this->audit->record('academic_year.created', $year, [], $year->only(['year', 'code', 'is_active']));

        return response()->json(['data' => $this->present($year->loadCount('semesters'))], 201);
    }

    public function update(Request $request, AcademicYear $academicYear): JsonResponse
    {
        $data = $this->validated($request, $academicYear);
        $before = $academicYear->only(array_keys($data));

        DB::transaction(function () use ($academicYear, $data): void {
            $academicYear->update($data);
            $this->keepSingleActive($academicYear);
        });
        $this->audit->record('academic_year.updated', $academicYear, $before, $academicYear->only(array_keys($data)));

        return response()->json(['data' => $this->present($academicYear->loadCount('semesters'))]);
    }

    public function destroy(AcademicYear $academicYear): JsonResponse
    {
        if ($academicYear->semesters()->exists()) {
            throw new HttpException(409, 'This academic year has semesters. Delete or move them first.');
        }

        $academicYear->delete();
        $this->audit->record('academic_year.deleted', $academicYear, $academicYear->only(['year', 'code']), []);

        return response()->json(['message' => 'Academic year deleted.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?AcademicYear $year = null): array
    {
        $presence = $year ? 'sometimes' : 'required';
        $v = $request->validate([
            'year' => [$presence, 'string', 'max:20'],
            'code' => [$presence, 'string', 'max:20', 'regex:/^[A-Za-z0-9_-]+$/', TenantRule::unique('academic_years', 'code')->ignore($year?->id)],
            'startDate' => [$presence, 'date'],
            'endDate' => [$presence, 'date', 'after:startDate'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        // On update only one of the dates may be sent; check it against the stored other one.
        if ($year && (isset($v['startDate']) xor isset($v['endDate']))) {
            $start = $v['startDate'] ?? $year->start_date->format('Y-m-d');
            $end = $v['endDate'] ?? $year->end_date->format('Y-m-d');
            abort_if(strtotime($end) <= strtotime($start), 422, 'The end date must be after the start date.');
        }

        return array_filter([
            'year' => $v['year'] ?? null,
            'code' => isset($v['code']) ? strtoupper($v['code']) : null,
            'start_date' => $v['startDate'] ?? null,
            'end_date' => $v['endDate'] ?? null,
            'is_active' => $v['isActive'] ?? null,
        ], fn ($value) => $value !== null);
    }

    /** Making a year active switches the others off. */
    private function keepSingleActive(AcademicYear $year): void
    {
        if ($year->is_active) {
            AcademicYear::query()->whereKeyNot($year->id)->where('is_active', true)->update(['is_active' => false]);
        }
    }

    /** @return array<string, mixed> */
    private function present(AcademicYear $year): array
    {
        return [
            'id' => $year->id,
            'year' => $year->year,
            'code' => $year->code,
            'startDate' => $year->start_date?->format('Y-m-d'),
            'endDate' => $year->end_date?->format('Y-m-d'),
            'isActive' => (bool) $year->is_active,
            'semestersCount' => $year->semesters_count ?? 0,
        ];
    }
}
