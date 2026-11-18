<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CustomModules\SaveCustomModuleRequest;
use App\Http\Resources\CustomModuleResource;
use App\Models\CustomFieldDefinition;
use App\Models\CustomModule;
use App\Services\Audit\AuditLogger;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Modules an institution admin creates. Creating, editing and deleting them needs
 * custom_fields.manage (route middleware); listing shows each user the modules they can view.
 */
class CustomModuleController extends Controller
{
    private const AUDITED = ['key', 'plural_label', 'singular_label', 'category', 'view_roles', 'edit_roles', 'is_active'];

    public function __construct(private readonly AuditLogger $audit) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Few modules per institution, so access is checked in PHP rather than with JSON queries.
        $modules = CustomModule::query()
            ->withCount('records')
            ->orderBy('sort_order')
            ->orderBy('plural_label')
            ->get()
            ->filter(fn (CustomModule $module) => $module->canView($user))
            ->values();

        return response()->json(['data' => CustomModuleResource::collection($modules)->resolve($request)]);
    }

    public function show(Request $request, CustomModule $customModule): JsonResponse
    {
        abort_unless($customModule->canView($request->user()), 403, 'You cannot view this module.');

        return response()->json(['data' => (new CustomModuleResource($customModule->loadCount('records')))->resolve($request)]);
    }

    public function store(SaveCustomModuleRequest $request): JsonResponse
    {
        $module = CustomModule::query()->create([
            ...$request->attributesForModel(),
            'created_by' => $request->user()->id,
        ])->refresh(); // Load the column defaults (is_active, sort_order).
        $this->audit->record('custom_module.created', $module, [], $module->only(self::AUDITED));

        return response()->json(['data' => (new CustomModuleResource($module->loadCount('records')))->resolve($request)], 201);
    }

    public function update(SaveCustomModuleRequest $request, CustomModule $customModule): JsonResponse
    {
        $attributes = $request->attributesForModel();
        $before = $customModule->only(array_keys($attributes));
        $customModule->update($attributes);
        $this->audit->record('custom_module.updated', $customModule, $before, $customModule->only(array_keys($attributes)));

        return response()->json(['data' => (new CustomModuleResource($customModule->loadCount('records')))->resolve($request)]);
    }

    /**
     * Sets the order of the modules (sidebar and catalog): `ids` lists module ids first to last.
     * Modules left out keep their place after the listed ones.
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer', 'distinct', TenantRule::exists('custom_modules', 'id')->whereNull('deleted_at')],
        ]);

        $ids = array_map('intval', $validated['ids']);
        $before = CustomModule::query()->orderBy('sort_order')->orderBy('plural_label')->pluck('id')->all();

        DB::transaction(function () use ($ids, $before): void {
            $order = [...$ids, ...array_values(array_diff($before, $ids))];
            foreach ($order as $position => $id) {
                CustomModule::query()->whereKey($id)->update(['sort_order' => $position]);
            }
        });
        $this->audit->record('custom_module.reordered', null, ['order' => $before], ['order' => $ids]);

        return $this->index($request);
    }

    /**
     * Soft delete: the module, its records and its field definitions disappear; their keys stay
     * reserved and the stored values stay in place, so the module can be restored from the database.
     */
    public function destroy(CustomModule $customModule): JsonResponse
    {
        DB::transaction(function () use ($customModule): void {
            CustomFieldDefinition::query()->where('entity', $customModule->customFieldEntity())->delete();
            $customModule->records()->delete();
            $customModule->delete();
        });
        $this->audit->record('custom_module.deleted', $customModule, $customModule->only(self::AUDITED), []);

        return response()->json(['message' => 'Module deleted.']);
    }
}
