<?php

namespace App\Services\Imports;

use App\Actions\Staff\SaveStaffMemberAction;
use App\Actions\Students\CreateStudentAction;
use App\DTOs\StaffMemberData;
use App\DTOs\StudentData;
use App\Enums\UserRole;
use App\Http\Requests\Students\StoreStudentRequest;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Institution;
use App\Models\User;
use App\Notifications\VerifyAccountNotification;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

/**
 * CSV imports of students and staff. Every row is validated with the same rules as the single
 * forms (plus duplicates inside the file); a dry run reports what would happen without saving.
 * New accounts get a random password and an email to set their own (VerifyAccountNotification);
 * if mail cannot be sent the account is still created and the report says so.
 */
class BulkImporter
{
    public const MAX_ROWS = 2000;

    public const STUDENT_COLUMNS = ['name', 'email', 'department_code', 'year', 'gender', 'phone', 'cgpa', 'attendance', 'fee_status'];

    public const STAFF_COLUMNS = ['name', 'email', 'department_code', 'designation', 'role', 'phone'];

    public function __construct(
        private readonly CreateStudentAction $createStudent,
        private readonly SaveStaffMemberAction $saveStaff,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Rows keyed by lower-case header. Blank lines are skipped.
     *
     * @return list<array<string, string>>
     */
    public function parse(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        $header = null;
        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            if ($header === null) {
                $line[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) $line[0]); // UTF-8 BOM from Excel
                $header = array_map(fn ($h) => Str::snake(trim((string) $h)), $line);

                continue;
            }
            if (count(array_filter($line, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }
            $rows[] = array_combine($header, array_pad(array_map(fn ($v) => trim((string) $v), $line), count($header), ''));
            abort_if(count($rows) > self::MAX_ROWS, 422, 'A file can have at most '.self::MAX_ROWS.' rows.');
        }
        fclose($handle);

        abort_if($header === null, 422, 'The file is empty.');

        return $rows;
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array<string, mixed>
     */
    public function students(array $rows, User $actor, bool $dryRun): array
    {
        $seen = [];

        return $this->run($rows, $dryRun, function (array $row) use (&$seen): array {
            $payload = [
                'name' => $row['name'] ?? '',
                'email' => strtolower($row['email'] ?? ''),
                'departmentCode' => strtoupper($row['department_code'] ?? ''),
                'year' => $row['year'] ?? 'year_1',
                'gender' => $row['gender'] ?? 'prefer_not_to_say',
                'phone' => ($row['phone'] ?? '') ?: null,
                'cgpa' => ($row['cgpa'] ?? '') === '' ? 0 : $row['cgpa'],
                'attendance' => ($row['attendance'] ?? '') === '' ? 0 : $row['attendance'],
                'feeStatus' => ($row['fee_status'] ?? '') ?: 'pending',
            ];
            $rules = [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', TenantRule::unique('students', 'email'), Rule::unique('users', 'email')],
                ...StoreStudentRequest::profileRules(),
                'departmentCode' => ['required', 'string', TenantRule::exists('departments', 'code')],
            ];

            return [$payload, $rules, $this->duplicate($seen, $payload['email'])];
        }, function (array $payload) use ($actor): string {
            $department = Department::query()->where('code', $payload['departmentCode'])->firstOrFail();
            $student = $this->createStudent->execute(
                StudentData::fromValidated([...$payload, 'password' => Str::random(40)]),
                $department,
                Institution::forNewAccountsOf($actor),
                $department->hod?->name ?? '',
            );
            $this->audit->record('student.imported', $student, [], $student->only(['name', 'email', 'department_code']));

            return $this->sendSetupEmail(User::query()->findOrFail($student->user_id));
        });
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @return array<string, mixed>
     */
    public function staff(array $rows, User $actor, bool $dryRun): array
    {
        $seen = [];
        $designations = Designation::query()->get(['id', 'name'])->keyBy(fn (Designation $d) => strtolower($d->name));

        return $this->run($rows, $dryRun, function (array $row) use (&$seen, $designations): array {
            $designation = $designations->get(strtolower($row['designation'] ?? ''));
            $payload = [
                'name' => $row['name'] ?? '',
                'email' => strtolower($row['email'] ?? ''),
                'departmentCode' => strtoupper($row['department_code'] ?? ''),
                'designation' => $row['designation'] ?? '',
                'designationId' => $designation?->id,
                'role' => ($row['role'] ?? '') ?: UserRole::Staff->value,
                'phone' => ($row['phone'] ?? '') ?: null,
            ];
            $rules = [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', Rule::unique('users', 'email')],
                'departmentCode' => ['required', 'string', TenantRule::exists('departments', 'code')],
                'designation' => ['required', 'string'],
                'designationId' => ['required'],
                'role' => [Rule::in([UserRole::Staff->value, UserRole::PlacementOfficer->value])],
                'phone' => ['nullable', 'string', 'max:30'],
            ];

            return [$payload, $rules, $this->duplicate($seen, $payload['email'])];
        }, function (array $payload) use ($actor): string {
            $staff = $this->saveStaff->execute(
                new StaffMemberData(
                    name: $payload['name'], email: $payload['email'], role: $payload['role'], designationId: (int) $payload['designationId'],
                    departmentCode: $payload['departmentCode'], password: Str::random(40), phone: $payload['phone'],
                    communicationAddress: null, permanentAddress: null, emergencyContactPerson: null, emergencyContactNumber: null,
                    biometricId: null, experienceYears: null, specialization: null, image: null,
                ),
                institutionId: Institution::forNewAccountsOf($actor),
            );
            $this->audit->record('staff.imported', $staff, [], $staff->only(['name', 'email', 'department_code']));

            return $this->sendSetupEmail($staff);
        }, ['designationId.required' => 'No designation with this name. Create it first or fix the spelling.']);
    }

    /**
     * @param  list<array<string, string>>  $rows
     * @param  callable(array<string, string>): array{0: array<string, mixed>, 1: array<string, mixed>, 2: ?string}  $prepare
     * @param  callable(array<string, mixed>): string  $create  Returns "sent" or "not_sent".
     * @param  array<string, string>  $messages
     * @return array<string, mixed>
     */
    private function run(array $rows, bool $dryRun, callable $prepare, callable $create, array $messages = []): array
    {
        $failed = [];
        $created = 0;
        $valid = 0;
        $emailsNotSent = 0;

        foreach ($rows as $index => $row) {
            $line = $index + 2; // Row 1 is the header.
            [$payload, $rules, $duplicate] = $prepare($row);
            $validator = Validator::make($payload, $rules, $messages);

            $errors = $validator->fails() ? array_map(fn (array $m) => $m[0], $validator->errors()->toArray()) : [];
            if ($duplicate !== null) {
                $errors['email'] = $duplicate;
            }
            if ($errors !== []) {
                $failed[] = ['row' => $line, 'email' => $payload['email'] ?? null, 'errors' => $errors];

                continue;
            }

            $valid++;
            if ($dryRun) {
                continue;
            }

            try {
                if ($create($payload) === 'not_sent') {
                    $emailsNotSent++;
                }
                $created++;
            } catch (Throwable $e) {
                report($e);
                $failed[] = ['row' => $line, 'email' => $payload['email'] ?? null, 'errors' => ['row' => 'Could not be saved: '.$e->getMessage()]];
            }
        }

        return [
            'dryRun' => $dryRun,
            'total' => count($rows),
            'valid' => $valid,
            'created' => $created,
            'failed' => $failed,
            'emailsNotSent' => $emailsNotSent,
        ];
    }

    /** @param  array<string, true>  $seen */
    private function duplicate(array &$seen, string $email): ?string
    {
        if ($email === '') {
            return null;
        }
        if (isset($seen[$email])) {
            return 'This email appears more than once in the file.';
        }
        $seen[$email] = true;

        return null;
    }

    private function sendSetupEmail(User $user): string
    {
        try {
            $user->notify(new VerifyAccountNotification(Password::broker()->createToken($user)));

            return 'sent';
        } catch (Throwable $e) {
            Log::warning("Import: setup email to {$user->email} failed: {$e->getMessage()}");

            return 'not_sent';
        }
    }
}
