<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\InstitutionSetting;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The institution's sidebar arrangement: per sidebar group, the order of its items and the
 * items hidden from everyone. Every member reads it; admins with settings.manage change it.
 *
 * Stored as the institution setting "sidebarLayout":
 * `{groups: {groupId: {order: [itemId, …], hidden: [itemId, …]}}}`. Item ids are page ids
 * (e.g. "departments", "module_5"); ids a user cannot open are simply skipped by the app.
 */
class SidebarLayoutController extends Controller
{
    public const SETTING_KEY = 'sidebarLayout';

    private const ID_PATTERN = 'regex:/^[a-z][a-z0-9_]{0,59}$/';

    public function __construct(private readonly AuditLogger $audit) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->layout($this->institutionId($request))]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'groups' => ['present', 'array', 'max:30'],
            'groups.*' => ['array:order,hidden'],
            'groups.*.order' => ['sometimes', 'array', 'max:100'],
            'groups.*.order.*' => ['string', 'distinct', self::ID_PATTERN],
            'groups.*.hidden' => ['sometimes', 'array', 'max:100'],
            'groups.*.hidden.*' => ['string', 'distinct', self::ID_PATTERN],
        ]);

        $groups = [];
        foreach ($validated['groups'] as $groupId => $group) {
            if (! is_string($groupId) || ! preg_match('/^[a-z][a-z0-9_]{0,39}$/', $groupId)) {
                abort(422, 'Invalid sidebar group.');
            }
            $groups[$groupId] = [
                'order' => array_values($group['order'] ?? []),
                'hidden' => array_values($group['hidden'] ?? []),
            ];
        }

        $institutionId = $this->institutionId($request);
        $before = $this->layout($institutionId);
        $after = ['groups' => (object) $groups];

        InstitutionSetting::query()->updateOrCreate(
            ['institution_id' => $institutionId, 'key' => self::SETTING_KEY],
            ['value' => $after, 'updated_by' => $request->user()->id],
        );
        $this->audit->record('institution.sidebar_layout_updated', null, $before, $after);

        return response()->json(['data' => $after]);
    }

    /** @return array{groups: object} */
    private function layout(int $institutionId): array
    {
        $value = InstitutionSetting::query()
            ->where('institution_id', $institutionId)
            ->where('key', self::SETTING_KEY)
            ->value('value');

        // JSON objects come back as arrays; keep "groups" an object in the response.
        return ['groups' => (object) (is_array($value) ? ($value['groups'] ?? []) : [])];
    }

    private function institutionId(Request $request): int
    {
        $institutionId = $request->user()->institution_id;
        abort_if($institutionId === null, 404, 'No institution.');

        return (int) $institutionId;
    }
}
