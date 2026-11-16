<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Timetable;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantRule;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Timetable entries per class. Students see their class's active entries (/student/timetable);
 * staff see their own (?mine=1). Saving refuses clashes: the same class, faculty member or room
 * booked twice at overlapping times on the same day while both entries are in effect.
 */
class TimetableController extends Controller
{
    public const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    public const SESSION_TYPES = ['lecture', 'practical', 'lab', 'tutorial'];

    private const RELATIONS = ['class:id,name,code', 'subject:id,name,code', 'faculty:id,name'];

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'classId' => ['nullable', 'integer'],
            'facultyId' => ['nullable', 'integer'],
            'mine' => ['nullable', 'boolean'],
        ]);

        $entries = Timetable::query()
            ->with(self::RELATIONS)
            ->when($filters['classId'] ?? null, fn ($q, $id) => $q->where('class_id', $id))
            ->when($filters['facultyId'] ?? null, fn ($q, $id) => $q->where('faculty_id', $id))
            ->when($request->boolean('mine'), fn ($q) => $q->where('faculty_id', $request->user()->id))
            ->get()
            ->sortBy(fn (Timetable $t) => sprintf('%d %s', array_search($t->day_of_week, self::DAYS, true), $t->start_time))
            ->values();

        return response()->json(['data' => $entries->map(fn (Timetable $t) => $this->present($t))->all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $this->ensureNoClash($data);

        $entry = Timetable::query()->create($data);
        $this->audit->record('timetable.created', $entry, [], $entry->only(['class_id', 'subject_id', 'faculty_id', 'day_of_week', 'start_time']));

        return response()->json(['data' => $this->present($entry)], 201);
    }

    public function update(Request $request, Timetable $timetable): JsonResponse
    {
        $data = $this->validated($request);
        $this->ensureNoClash($data, $timetable->id);

        $before = $timetable->only(array_keys($data));
        $timetable->update($data);
        $this->audit->record('timetable.updated', $timetable, $before, $timetable->only(array_keys($data)));

        return response()->json(['data' => $this->present($timetable)]);
    }

    public function destroy(Timetable $timetable): JsonResponse
    {
        $timetable->delete();
        $this->audit->record('timetable.deleted', $timetable, $timetable->only(['class_id', 'subject_id', 'day_of_week', 'start_time']), []);

        return response()->json(['message' => 'Timetable entry removed.']);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $v = $request->validate([
            'classId' => ['required', 'integer', TenantRule::exists('classes', 'id')->whereNull('deleted_at')],
            'subjectId' => ['required', 'integer', TenantRule::exists('subjects', 'id')->whereNull('deleted_at')],
            'facultyId' => ['required', 'integer', TenantRule::exists('users', 'id')->whereIn('role', [UserRole::Staff->value, UserRole::PlacementOfficer->value])->whereNull('deleted_at')],
            'dayOfWeek' => ['required', Rule::in(self::DAYS)],
            'startTime' => ['required', 'date_format:H:i'],
            'endTime' => ['required', 'date_format:H:i', 'after:startTime'],
            'roomNumber' => ['nullable', 'string', 'max:50'],
            'sessionType' => ['nullable', Rule::in(self::SESSION_TYPES)],
            'effectiveFrom' => ['nullable', 'date'],
            'effectiveTo' => ['nullable', 'date', 'after_or_equal:effectiveFrom'],
        ], ['facultyId.exists' => 'Choose a staff member of this institution.']);

        return [
            'class_id' => $v['classId'],
            'subject_id' => $v['subjectId'],
            'faculty_id' => $v['facultyId'],
            'day_of_week' => $v['dayOfWeek'],
            'start_time' => $v['startTime'].':00',
            'end_time' => $v['endTime'].':00',
            'room_number' => isset($v['roomNumber']) && $v['roomNumber'] !== '' ? $v['roomNumber'] : null,
            'session_type' => $v['sessionType'] ?? 'lecture',
            'effective_from' => $v['effectiveFrom'] ?? now()->toDateString(),
            'effective_to' => $v['effectiveTo'] ?? null,
        ];
    }

    /** @param  array<string, mixed>  $data */
    private function ensureNoClash(array $data, ?int $ignoreId = null): void
    {
        $overlapping = fn (): Builder => Timetable::query()
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->where('day_of_week', $data['day_of_week'])
            ->where('start_time', '<', $data['end_time'])
            ->where('end_time', '>', $data['start_time'])
            // Both entries in effect at some common date.
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $data['effective_from']))
            ->when($data['effective_to'], fn ($q, $to) => $q->whereDate('effective_from', '<=', $to));

        $errors = [];
        if ($overlapping()->where('class_id', $data['class_id'])->exists()) {
            $errors['startTime'] = 'This class already has a session at that time.';
        }
        if ($overlapping()->where('faculty_id', $data['faculty_id'])->exists()) {
            $errors['facultyId'] = 'This faculty member is already teaching at that time.';
        }
        if ($data['room_number'] !== null && $overlapping()->where('room_number', $data['room_number'])->exists()) {
            $errors['roomNumber'] = 'This room is already booked at that time.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /** @return array<string, mixed> */
    private function present(Timetable $t): array
    {
        $t->loadMissing(self::RELATIONS);

        return [
            'id' => $t->id,
            'classId' => $t->class_id,
            'subjectId' => $t->subject_id,
            'facultyId' => $t->faculty_id,
            'dayOfWeek' => $t->day_of_week,
            'startTime' => substr((string) $t->start_time, 0, 5),
            'endTime' => substr((string) $t->end_time, 0, 5),
            'roomNumber' => $t->room_number,
            'sessionType' => $t->session_type,
            'effectiveFrom' => $t->effective_from ? substr((string) $t->effective_from, 0, 10) : null,
            'effectiveTo' => $t->effective_to ? substr((string) $t->effective_to, 0, 10) : null,
            'class' => $t->class?->only(['id', 'name', 'code']),
            'subject' => $t->subject?->only(['id', 'name', 'code']),
            'faculty' => $t->faculty?->only(['id', 'name']),
        ];
    }
}
