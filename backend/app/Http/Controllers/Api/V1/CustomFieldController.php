<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\CustomFields\SaveCustomFieldDefinitionRequest;
use App\Http\Resources\CustomFieldDefinitionResource;
use App\Models\CustomFieldDefinition;
use App\Models\Student;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\CustomFields\CustomFieldService;
use App\Support\Campus\CampusPermission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Admin-defined form fields (definitions) and their values on individual records.
 */
class CustomFieldController extends Controller
{
    /** Permission needed to change a record's custom field values, per entity. */
    private const EDIT_PERMISSION = [
        CustomFieldDefinition::ENTITY_STUDENT => CampusPermission::STUDENTS_CREATE,
        CustomFieldDefinition::ENTITY_STAFF => CampusPermission::DEPARTMENTS_CREATE,
        CustomFieldDefinition::ENTITY_SUBJECT => CampusPermission::DEPARTMENTS_CREATE,
        CustomFieldDefinition::ENTITY_EXAM => CampusPermission::EXAMS_EDIT,
    ];

    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Field definitions. Forms need them, so any signed-in user may read them; inactive
     * fields are only listed for managers (`includeInactive=1`).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entity' => ['nullable', Rule::in(array_keys(CustomFieldDefinition::ENTITIES))],
            'includeInactive' => ['nullable', 'boolean'],
        ]);

        $includeInactive = ($validated['includeInactive'] ?? false)
            && $request->user()->can(CampusPermission::CUSTOM_FIELDS_MANAGE);

        $definitions = CustomFieldDefinition::query()
            ->when($validated['entity'] ?? null, fn ($query, $entity) => $query->where('entity', $entity))
            ->unless($includeInactive, fn ($query) => $query->where('is_active', true))
            ->orderBy('entity')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['data' => CustomFieldDefinitionResource::collection($definitions)->resolve($request)]);
    }

    public function store(SaveCustomFieldDefinitionRequest $request): JsonResponse
    {
        $definition = CustomFieldDefinition::query()->create($request->attributesForModel());
        $this->audit->record('custom_field.created', $definition, [], $definition->only(['entity', 'key', 'label', 'type']));

        return response()->json(['data' => (new CustomFieldDefinitionResource($definition))->resolve($request)], 201);
    }

    public function update(SaveCustomFieldDefinitionRequest $request, CustomFieldDefinition $customField): JsonResponse
    {
        $attributes = $request->attributesForModel();

        if (isset($attributes['type']) && $attributes['type'] !== $customField->type
            && CustomFieldDefinition::columnForType($attributes['type']) !== $customField->valueColumn()
            && $customField->values()->exists()) {
            throw new HttpException(409, 'This field already has values, so its type can only change to one stored the same way. Create a new field instead.');
        }

        $before = $customField->only(array_keys($attributes));
        $customField->update($attributes);
        $this->audit->record('custom_field.updated', $customField, $before, $customField->only(array_keys($attributes)));

        return response()->json(['data' => (new CustomFieldDefinitionResource($customField))->resolve($request)]);
    }

    /** Soft delete: the field disappears from forms and dashboards; its key stays reserved. */
    public function destroy(CustomFieldDefinition $customField): JsonResponse
    {
        $customField->delete();
        $this->audit->record('custom_field.deleted', $customField, $customField->only(['entity', 'key', 'label']), []);

        return response()->json(['message' => 'Custom field deleted.']);
    }

    /** One record's values, with every active field present. */
    public function showValues(Request $request, string $entity, int $id, CustomFieldService $fields): JsonResponse
    {
        $record = $this->record($entity, $id);
        $this->authorizeView($request->user(), $entity, $record);

        return response()->json(['data' => $fields->valuesFor($record, $entity)]);
    }

    /** Sets values on one record. Keys that are left out keep their value. */
    public function updateValues(Request $request, string $entity, int $id, CustomFieldService $fields): JsonResponse
    {
        $record = $this->record($entity, $id);
        $this->authorizeEdit($request->user(), $entity, $record);

        $validated = $request->validate(
            ['customFields' => ['required', 'array'], ...array_diff_key($fields->rules($entity), ['customFields' => true])],
            [],
            $fields->attributes($entity),
        );

        DB::transaction(fn () => $fields->save($record, $entity, $validated['customFields'] ?? []));

        return response()->json(['data' => $fields->valuesFor($record, $entity)]);
    }

    private function record(string $entity, int $id): Model
    {
        $model = CustomFieldDefinition::ENTITIES[$entity] ?? abort(404);

        // Every model here is tenant-scoped (BelongsToInstitution), so another institution's id is a 404.
        return $model::query()
            ->when($entity === CustomFieldDefinition::ENTITY_STAFF, fn ($query) => $query->whereIn(
                'role',
                collect(UserRole::cases())->filter(fn (UserRole $role) => $role->isInstitutionStaff())->map->value->all(),
            ))
            ->findOrFail($id);
    }

    private function authorizeView(User $user, string $entity, Model $record): void
    {
        $allowed = match ($entity) {
            CustomFieldDefinition::ENTITY_STUDENT => $user->can(CampusPermission::STUDENTS_VIEW)
                || ($record instanceof Student && $record->user_id === $user->id),
            CustomFieldDefinition::ENTITY_STAFF => $user->can(CampusPermission::DEPARTMENTS_VIEW) || $record->getKey() === $user->id,
            CustomFieldDefinition::ENTITY_SUBJECT => $user->can(CampusPermission::DEPARTMENTS_VIEW) || $user->can(CampusPermission::MARKS_VIEW),
            CustomFieldDefinition::ENTITY_EXAM => $user->can(CampusPermission::EXAMS_VIEW) || $user->can(CampusPermission::MARKS_VIEW),
            default => false,
        };

        abort_unless($allowed, 403, 'You cannot view this record.');
    }

    private function authorizeEdit(User $user, string $entity, Model $record): void
    {
        abort_unless($user->can(self::EDIT_PERMISSION[$entity]), 403, 'You cannot edit this record.');

        if ($record instanceof Student) {
            Gate::forUser($user)->authorize('manage', $record);
        }
    }
}
