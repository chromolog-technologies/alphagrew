<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\FeeStructure;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\StudentFeePayment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Support\Campus\CampusPermission;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Campus fees as record-keeping: fee structures per course semester, the dues they create for
 * students, and payments recorded by staff with a receipt each. Online payment is not built.
 * fees.view reads, fees.manage changes; students read their own fees.
 */
class FeeController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    // ---- Fee structures -------------------------------------------------------------------

    public function structures(Request $request): JsonResponse
    {
        $this->authorizeView($request->user());

        $structures = FeeStructure::query()
            ->with(['course:id,name,code', 'academicYear:id,year'])
            ->withCount('studentFees')
            ->withSum('studentFees as collected', 'amount_paid')
            ->orderByDesc('due_date')
            ->get();

        return response()->json(['data' => $structures->map(fn (FeeStructure $f) => $this->presentStructure($f))->all()]);
    }

    public function storeStructure(Request $request): JsonResponse
    {
        $this->authorizeManage($request->user());
        $structure = FeeStructure::query()->create($this->structureData($request));
        $this->audit->record('fee_structure.created', $structure, [], $structure->only(['course_id', 'semester', 'total_fee']));

        return response()->json(['data' => $this->presentStructure($structure->loadCount('studentFees'))], 201);
    }

    public function updateStructure(Request $request, FeeStructure $feeStructure): JsonResponse
    {
        $this->authorizeManage($request->user());
        $data = $this->structureData($request);
        $before = $feeStructure->only(['total_fee', 'due_date']);

        DB::transaction(function () use ($feeStructure, $data): void {
            $feeStructure->update($data);
            // Dues follow the structure; what was paid stays.
            $feeStructure->studentFees()->get()->each(function (StudentFee $fee) use ($feeStructure): void {
                $fee->update(['amount_due' => $feeStructure->total_fee, 'due_date' => $feeStructure->due_date]);
                $fee->refreshTotals();
            });
        });
        $this->audit->record('fee_structure.updated', $feeStructure, $before, $feeStructure->only(['total_fee', 'due_date']));

        return response()->json(['data' => $this->presentStructure($feeStructure->loadCount('studentFees'))]);
    }

    public function destroyStructure(Request $request, FeeStructure $feeStructure): JsonResponse
    {
        $this->authorizeManage($request->user());
        $hasPayments = StudentFeePayment::query()->whereIn('student_fee_id', $feeStructure->studentFees()->select('id'))->exists();
        if ($hasPayments) {
            throw new HttpException(409, 'Payments have been recorded against this fee structure, so it cannot be deleted.');
        }

        DB::transaction(function () use ($feeStructure): void {
            $feeStructure->studentFees()->delete();
            $feeStructure->delete();
        });
        $this->audit->record('fee_structure.deleted', $feeStructure, $feeStructure->only(['course_id', 'semester', 'total_fee']), []);

        return response()->json(['message' => 'Fee structure deleted.']);
    }

    /** Creates the dues for students (by id, or everyone in a class). Students already billed are skipped. */
    public function assign(Request $request, FeeStructure $feeStructure): JsonResponse
    {
        $this->authorizeManage($request->user());
        $v = $request->validate([
            'studentIds' => ['required_without:classId', 'array', 'max:2000'],
            'studentIds.*' => ['integer', TenantRule::exists('students', 'id')->whereNull('deleted_at')],
            'classId' => ['required_without:studentIds', 'integer', TenantRule::exists('classes', 'id')],
        ]);

        $ids = isset($v['classId'])
            ? ClassModel::query()->findOrFail($v['classId'])->students()->pluck('students.id')->all()
            : array_map('intval', $v['studentIds']);
        $existing = $feeStructure->studentFees()->whereIn('student_id', $ids)->pluck('student_id')->all();
        $new = array_values(array_diff(array_unique($ids), $existing));

        DB::transaction(function () use ($feeStructure, $new): void {
            foreach ($new as $studentId) {
                $feeStructure->studentFees()->create([
                    'student_id' => $studentId, 'amount_due' => $feeStructure->total_fee, 'amount_paid' => 0,
                    'status' => 'pending', 'due_date' => $feeStructure->due_date,
                ]);
                Student::query()->whereKey($studentId)->update(['fee_status' => 'pending']);
            }
        });
        $this->audit->record('fee_structure.assigned', $feeStructure, [], ['students' => count($new)]);

        return response()->json(['data' => ['assigned' => count($new), 'skipped' => count($ids) - count($new)]]);
    }

    // ---- Student fees and payments ------------------------------------------------------------

    public function studentFees(Request $request): JsonResponse
    {
        $this->authorizeView($request->user());
        $v = $request->validate([
            'feeStructureId' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['pending', 'partial', 'paid', 'overdue'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $fees = StudentFee::query()
            ->with(['student:id,name,registration_number,department_code', 'feeStructure.course:id,code,name'])
            ->when($v['feeStructureId'] ?? null, fn ($q, $id) => $q->where('fee_structure_id', $id))
            ->when(($v['status'] ?? null) === 'overdue', fn ($q) => $q->where('status', '!=', 'paid')->whereDate('due_date', '<', now()->toDateString()))
            ->when(in_array($v['status'] ?? null, ['pending', 'partial', 'paid'], true), fn ($q) => $q->where('status', $v['status']))
            ->when($v['search'] ?? null, fn ($q, $s) => $q->whereHas('student', fn ($st) => $st->where('name', 'like', '%'.addcslashes($s, '%_').'%')->orWhere('registration_number', 'like', '%'.addcslashes($s, '%_').'%')))
            ->orderBy('due_date')
            ->paginate(50);

        return response()->json([
            'data' => collect($fees->items())->map(fn (StudentFee $f) => $this->presentFee($f))->all(),
            'meta' => ['currentPage' => $fees->currentPage(), 'lastPage' => $fees->lastPage(), 'total' => $fees->total()],
        ]);
    }

    public function showStudentFee(Request $request, StudentFee $studentFee): JsonResponse
    {
        $user = $request->user();
        $own = $studentFee->student?->user_id === $user->id;
        abort_unless($own || $user->can(CampusPermission::FEES_VIEW), 403, 'You cannot view this fee.');

        return response()->json(['data' => $this->presentFee($studentFee, withPayments: true)]);
    }

    public function myFees(Request $request): JsonResponse
    {
        $student = Student::query()->where('user_id', $request->user()->id)->first();
        abort_unless($student, 404, 'No student record is linked to your account.');

        $fees = StudentFee::query()->with(['feeStructure.course:id,code,name', 'payments' => fn ($q) => $q->whereNull('voided_at')])
            ->where('student_id', $student->id)->orderBy('due_date')->get();

        return response()->json([
            'data' => $fees->map(fn (StudentFee $f) => $this->presentFee($f, withPayments: true))->all(),
            'meta' => ['totalDue' => round($fees->sum(fn (StudentFee $f) => $f->balance()), 2)],
        ]);
    }

    public function recordPayment(Request $request, StudentFee $studentFee): JsonResponse
    {
        $this->authorizeManage($request->user());
        $v = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0'],
            'method' => ['required', Rule::in(StudentFeePayment::METHODS)],
            'reference' => ['nullable', 'string', 'max:100'],
            'paidOn' => ['nullable', 'date', 'before_or_equal:today'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);
        if ($v['amount'] > $studentFee->balance() + 0.005) {
            throw ValidationException::withMessages(['amount' => "The amount is more than the balance due ({$studentFee->balance()})."]);
        }

        $payment = DB::transaction(function () use ($studentFee, $v, $request): StudentFeePayment {
            $payment = $studentFee->payments()->create([
                'amount' => round((float) $v['amount'], 2), 'method' => $v['method'], 'reference' => $v['reference'] ?? null,
                'paid_on' => $v['paidOn'] ?? now()->toDateString(), 'remarks' => $v['remarks'] ?? null, 'recorded_by' => $request->user()->id,
            ]);
            $payment->update(['receipt_number' => sprintf('RCPT-%s-%06d', now()->format('Y'), $payment->id)]);
            $studentFee->refreshTotals();

            return $payment;
        });
        $this->audit->record('fee_payment.recorded', $payment, [], $payment->only(['student_fee_id', 'amount', 'method', 'receipt_number']));

        return response()->json(['data' => $this->presentFee($studentFee->refresh(), withPayments: true)], 201);
    }

    public function voidPayment(Request $request, StudentFeePayment $payment): JsonResponse
    {
        $this->authorizeManage($request->user());
        abort_if($payment->voided_at !== null, 409, 'This payment is already void.');
        $v = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        DB::transaction(function () use ($payment, $v, $request): void {
            $payment->update(['voided_at' => now(), 'voided_by' => $request->user()->id, 'void_reason' => $v['reason']]);
            $payment->studentFee->refreshTotals();
        });
        $this->audit->record('fee_payment.voided', $payment, [], ['receipt_number' => $payment->receipt_number, 'reason' => $v['reason']]);

        return response()->json(['data' => $this->presentFee($payment->studentFee->refresh(), withPayments: true)]);
    }

    // ---- Helpers ------------------------------------------------------------------------------

    private function authorizeView(User $user): void
    {
        abort_unless($user->can(CampusPermission::FEES_VIEW) || $user->can(CampusPermission::FEES_MANAGE), 403, 'You cannot view fees.');
    }

    private function authorizeManage(User $user): void
    {
        abort_unless($user->can(CampusPermission::FEES_MANAGE), 403, 'You cannot manage fees.');
    }

    /** @return array<string, mixed> */
    private function structureData(Request $request): array
    {
        $v = $request->validate([
            'academicYearId' => ['required', 'integer', TenantRule::exists('academic_years', 'id')],
            'courseId' => ['required', 'integer', TenantRule::exists('courses', 'id')],
            'semester' => ['required', 'integer', 'min:1', 'max:16'],
            'tuitionFee' => ['required', 'numeric', 'min:0'],
            'labFee' => ['nullable', 'numeric', 'min:0'],
            'libraryFee' => ['nullable', 'numeric', 'min:0'],
            'examFee' => ['nullable', 'numeric', 'min:0'],
            'otherFee' => ['nullable', 'numeric', 'min:0'],
            'dueDate' => ['required', 'date'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);
        $parts = [
            'tuition_fee' => (float) $v['tuitionFee'], 'lab_fee' => (float) ($v['labFee'] ?? 0), 'library_fee' => (float) ($v['libraryFee'] ?? 0),
            'exam_fee' => (float) ($v['examFee'] ?? 0), 'other_fee' => (float) ($v['otherFee'] ?? 0),
        ];

        return [
            'academic_year_id' => $v['academicYearId'], 'course_id' => $v['courseId'], 'semester' => $v['semester'],
            ...$parts, 'total_fee' => round(array_sum($parts), 2), 'due_date' => $v['dueDate'], 'remarks' => $v['remarks'] ?? null,
        ];
    }

    /** @return array<string, mixed> */
    private function presentStructure(FeeStructure $f): array
    {
        $f->loadMissing(['course:id,name,code', 'academicYear:id,year']);

        return [
            'id' => $f->id, 'academicYearId' => $f->academic_year_id, 'courseId' => $f->course_id, 'semester' => $f->semester,
            'tuitionFee' => $f->tuition_fee, 'labFee' => $f->lab_fee, 'libraryFee' => $f->library_fee, 'examFee' => $f->exam_fee,
            'otherFee' => $f->other_fee, 'totalFee' => $f->total_fee, 'dueDate' => $f->due_date?->toDateString(), 'remarks' => $f->remarks,
            'course' => $f->course?->only(['id', 'name', 'code']), 'academicYear' => $f->academicYear?->only(['id', 'year']),
            'studentsBilled' => $f->student_fees_count ?? 0, 'collected' => round((float) ($f->collected ?? 0), 2),
        ];
    }

    /** @return array<string, mixed> */
    private function presentFee(StudentFee $f, bool $withPayments = false): array
    {
        $f->loadMissing(['student:id,name,registration_number,department_code', 'feeStructure.course:id,code,name']);

        return [
            'id' => $f->id, 'studentId' => $f->student_id, 'feeStructureId' => $f->fee_structure_id,
            'amountDue' => $f->amount_due, 'amountPaid' => $f->amount_paid, 'balance' => $f->balance(),
            'status' => $f->displayStatus(), 'dueDate' => $f->due_date?->toDateString(), 'paidDate' => $f->paid_date?->toDateString(),
            'student' => $f->student ? ['id' => $f->student->id, 'name' => $f->student->name, 'registrationNumber' => $f->student->registration_number, 'departmentCode' => $f->student->department_code] : null,
            'feeStructure' => $f->feeStructure ? ['id' => $f->feeStructure->id, 'semester' => $f->feeStructure->semester, 'course' => $f->feeStructure->course?->only(['code', 'name'])] : null,
            ...($withPayments ? ['payments' => $f->payments()->orderBy('paid_on')->get()->map(fn (StudentFeePayment $p) => [
                'id' => $p->id, 'receiptNumber' => $p->receipt_number, 'amount' => $p->amount, 'method' => $p->method, 'reference' => $p->reference,
                'paidOn' => $p->paid_on?->toDateString(), 'remarks' => $p->remarks, 'voided' => $p->voided_at !== null, 'voidReason' => $p->void_reason,
            ])->all()] : []),
        ];
    }
}
