<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomModules\SaveCustomModuleRecordRequest;
use App\Models\CustomModule;
use App\Models\CustomModuleRecord;
use App\Services\Audit\AuditLogger;
use App\Services\CustomFields\CustomFieldService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Records of a custom module. Reading needs the module's view access, changing needs its
 * edit access (CustomModule::canView / canEdit).
 */
class CustomModuleRecordController extends Controller
{
    public function __construct(
        private readonly CustomFieldService $fields,
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request, CustomModule $customModule): JsonResponse
    {
        $this->authorizeView($request, $customModule);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(CustomModuleRecord::STATUSES)],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $records = $customModule->records()
            ->when($validated['search'] ?? null, fn ($query, $search) => $query->where('title', 'like', '%'.addcslashes($search, '%_\\').'%'))
            ->when($validated['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest('id')
            ->paginate((int) ($validated['perPage'] ?? 25));

        $values = $this->fields->valuesForMany($records->getCollection(), $customModule->customFieldEntity());

        return response()->json([
            'data' => $records->getCollection()->map(fn (CustomModuleRecord $record) => $this->present($record, $values[$record->id] ?? []))->all(),
            'meta' => [
                'currentPage' => $records->currentPage(),
                'lastPage' => $records->lastPage(),
                'perPage' => $records->perPage(),
                'total' => $records->total(),
            ],
        ]);
    }

    public function show(Request $request, CustomModule $customModule, CustomModuleRecord $record): JsonResponse
    {
        $this->authorizeView($request, $customModule);

        return response()->json(['data' => $this->presentWithValues($customModule, $record)]);
    }

    public function store(SaveCustomModuleRecordRequest $request, CustomModule $customModule): JsonResponse
    {
        $record = DB::transaction(function () use ($request, $customModule): CustomModuleRecord {
            $record = $customModule->records()->create([
                'title' => $request->validated('title'),
                'status' => $request->validated('status') ?? 'active',
                'created_by' => $request->user()->id,
                'updated_by' => $request->user()->id,
            ]);
            $this->fields->save($record, $customModule->customFieldEntity(), $request->customFields());

            return $record;
        });
        $this->audit->record('custom_module_record.created', $record, [], $record->only(['custom_module_id', 'title', 'status']));

        return response()->json(['data' => $this->presentWithValues($customModule, $record)], 201);
    }

    public function update(SaveCustomModuleRecordRequest $request, CustomModule $customModule, CustomModuleRecord $record): JsonResponse
    {
        $attributes = array_intersect_key($request->validated(), array_flip(['title', 'status']));
        $before = $record->only(array_keys($attributes));

        DB::transaction(function () use ($request, $customModule, $record, $attributes): void {
            $record->update([...$attributes, 'updated_by' => $request->user()->id]);
            $this->fields->save($record, $customModule->customFieldEntity(), $request->customFields());
        });
        $this->audit->record('custom_module_record.updated', $record, $before, $record->only(array_keys($attributes)));

        return response()->json(['data' => $this->presentWithValues($customModule, $record)]);
    }

    public function destroy(Request $request, CustomModule $customModule, CustomModuleRecord $record): JsonResponse
    {
        abort_unless($customModule->canEdit($request->user()), 403, 'You cannot change this module.');

        $record->delete();
        $this->audit->record('custom_module_record.deleted', $record, $record->only(['custom_module_id', 'title', 'status']), []);

        return response()->json(['message' => 'Record deleted.']);
    }

    private function authorizeView(Request $request, CustomModule $module): void
    {
        abort_unless($module->canView($request->user()), 403, 'You cannot view this module.');
    }

    /** @return array<string, mixed> */
    private function presentWithValues(CustomModule $module, CustomModuleRecord $record): array
    {
        return $this->present($record, $this->fields->valuesFor($record, $module->customFieldEntity()));
    }

    /**
     * @param  array<string, mixed>  $customFields
     * @return array<string, mixed>
     */
    private function present(CustomModuleRecord $record, array $customFields): array
    {
        return [
            'id' => $record->id,
            'moduleId' => $record->custom_module_id,
            'title' => $record->title,
            'status' => $record->status,
            'customFields' => $customFields,
            'createdBy' => $record->created_by,
            'createdAt' => $record->created_at?->toIso8601String(),
            'updatedAt' => $record->updated_at?->toIso8601String(),
        ];
    }
}
