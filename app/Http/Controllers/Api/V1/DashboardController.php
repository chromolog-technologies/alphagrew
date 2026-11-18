<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboards\SaveDashboardRequest;
use App\Http\Resources\DashboardResource;
use App\Models\Dashboard;
use App\Models\User;
use App\Services\Dashboards\DashboardScope;
use App\Services\Dashboards\DashboardTemplates;
use App\Services\Dashboards\SourceRegistry;
use App\Services\Dashboards\WidgetQuery;
use App\Support\Tenancy\TenantRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Role templates, user-built dashboards, sharing, and the widget query endpoint.
 *
 * Widget data always comes from POST /dashboards/query, which applies the viewer's own
 * DashboardScope; a shared dashboard therefore never shows more than the viewer may see.
 */
class DashboardController extends Controller
{
    /** What the user's widgets can query: sources, fields (with custom fields) and scope. */
    public function sources(Request $request, SourceRegistry $sources): JsonResponse
    {
        $user = $request->user();
        $scope = DashboardScope::for($user);

        return response()->json([
            'data' => array_map(fn ($source) => $source->describe($sources->customFields()), $sources->availableTo($user, $scope)),
            'scope' => $scope->toArray(),
        ]);
    }

    /**
     * Runs one widget spec (`spec`), or several at once (`specs`, keyed by widget id) so a
     * whole dashboard loads in one request. In batch mode each result is independent: a
     * widget the viewer cannot see returns its error instead of failing the others.
     */
    public function query(Request $request, WidgetQuery $query): JsonResponse
    {
        $validated = $request->validate([
            'spec' => ['required_without:specs', 'array'],
            'specs' => ['required_without:spec', 'array', 'max:'.SaveDashboardRequest::MAX_WIDGETS],
            'specs.*' => ['array'],
        ]);

        if (isset($validated['spec'])) {
            return response()->json(['data' => $query->run($request->user(), $validated['spec'])]);
        }

        $results = [];
        foreach ($validated['specs'] as $key => $spec) {
            try {
                $results[$key] = ['ok' => true, ...$query->run($request->user(), $spec)];
            } catch (ValidationException $e) {
                $results[$key] = ['ok' => false, 'status' => 422, 'message' => collect($e->errors())->flatten()->first()];
            } catch (HttpException $e) {
                $results[$key] = ['ok' => false, 'status' => $e->getStatusCode(), 'message' => $e->getMessage()];
            }
        }

        return response()->json(['data' => (object) $results]);
    }

    /** Own dashboards, dashboards shared with the user, and the templates they can use. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => DashboardResource::collection($this->visibleTo($user))->resolve($request),
            'templates' => array_map(
                fn (string $key) => DashboardResource::template($this->templateFor($user, $key)),
                DashboardTemplates::keysFor($user),
            ),
            'defaultTemplate' => DashboardTemplates::keyFor($user),
        ]);
    }

    /**
     * The dashboard the user opens on: their own home dashboard, else one shared with them
     * as the default (designation before role), else the template for their role.
     */
    public function home(Request $request): JsonResponse
    {
        $user = $request->user();
        $visible = $this->visibleTo($user);

        $home = $visible->first(fn (Dashboard $d) => $d->isOwnedBy($user) && $d->is_home)
            ?? $visible->first(fn (Dashboard $d) => $d->audience_default && $user->designation_id !== null
                && in_array((int) $user->designation_id, array_map('intval', $d->shared_designation_ids ?? []), true))
            ?? $visible->first(fn (Dashboard $d) => $d->audience_default && in_array($user->role, $d->shared_roles ?? [], true));

        return response()->json([
            'data' => $home
                ? (new DashboardResource($home))->resolve($request)
                : DashboardResource::template($this->templateFor($user, DashboardTemplates::keyFor($user))),
        ]);
    }

    public function show(Request $request, Dashboard $dashboard): JsonResponse
    {
        abort_unless($dashboard->isVisibleTo($request->user()), 404);

        return response()->json(['data' => (new DashboardResource($dashboard->load('owner')))->resolve($request)]);
    }

    public function store(SaveDashboardRequest $request): JsonResponse
    {
        $user = $request->user();
        $widgets = $request->widgets();
        $templateKey = null;
        $description = $request->validated('description');

        if ($key = $request->validated('fromTemplate')) {
            $template = $this->templateFor($user, $key);
            $widgets ??= $template['widgets'];
            $templateKey = $key;
            $description ??= $template['description'];
        } elseif ($id = $request->validated('fromDashboard')) {
            $source = Dashboard::query()->find($id);
            abort_unless($source && $source->isVisibleTo($user), 404, 'Dashboard not found.');
            $widgets ??= $source->widgets;
            $templateKey = $source->template_key;
            $description ??= $source->description;
        }

        $dashboard = DB::transaction(function () use ($request, $user, $widgets, $templateKey, $description): Dashboard {
            if ($request->boolean('isHome')) {
                $this->clearHome($user);
            }

            return Dashboard::query()->create([
                'owner_id' => $user->id,
                'name' => $request->validated('name'),
                'description' => $description,
                'template_key' => $templateKey,
                'widgets' => $widgets ?? [],
                'is_home' => $request->boolean('isHome'),
            ]);
        });

        return response()->json(['data' => (new DashboardResource($dashboard->load('owner')))->resolve($request)], 201);
    }

    public function update(SaveDashboardRequest $request, Dashboard $dashboard): JsonResponse
    {
        $attributes = array_intersect_key($request->validated(), array_flip(['name', 'description']));

        if (($widgets = $request->widgets()) !== null) {
            $attributes['widgets'] = $widgets;
        }

        DB::transaction(function () use ($request, $dashboard, $attributes): void {
            if ($request->has('isHome')) {
                if ($request->boolean('isHome')) {
                    $this->clearHome($request->user());
                }
                $attributes['is_home'] = $request->boolean('isHome');
            }

            $dashboard->update($attributes);
        });

        return response()->json(['data' => (new DashboardResource($dashboard->fresh('owner')))->resolve($request)]);
    }

    public function destroy(Request $request, Dashboard $dashboard): JsonResponse
    {
        abort_unless($dashboard->isOwnedBy($request->user()), $dashboard->isVisibleTo($request->user()) ? 403 : 404, 'Only the owner can delete this dashboard.');

        $dashboard->delete();

        return response()->json(['message' => 'Dashboard deleted.']);
    }

    /** Share with roles and designations (read-only for them), optionally as their default. */
    public function share(Request $request, Dashboard $dashboard): JsonResponse
    {
        abort_unless($dashboard->isOwnedBy($request->user()), $dashboard->isVisibleTo($request->user()) ? 403 : 404, 'Only the owner can share this dashboard.');

        $validated = $request->validate([
            'roles' => ['present', 'array'],
            'roles.*' => ['string', 'distinct', Rule::in(array_values(array_diff(UserRole::values(), [UserRole::SuperAdmin->value])))],
            'designationIds' => ['present', 'array'],
            'designationIds.*' => ['integer', 'distinct', TenantRule::exists('designations', 'id')],
            'audienceDefault' => ['sometimes', 'boolean'],
        ]);

        $dashboard->update([
            'shared_roles' => array_values($validated['roles']) ?: null,
            'shared_designation_ids' => array_map('intval', $validated['designationIds']) ?: null,
            'audience_default' => ($validated['roles'] || $validated['designationIds']) && ($validated['audienceDefault'] ?? false),
        ]);

        return response()->json(['data' => (new DashboardResource($dashboard->fresh('owner')))->resolve($request)]);
    }

    /**
     * A template without the widgets whose data the user cannot query (e.g. attendance for a
     * placement officer), so nobody opens a dashboard full of "not available" tiles.
     *
     * @return array{key: string, name: string, description: string, widgets: list<array<string, mixed>>}
     */
    private function templateFor(User $user, string $key): array
    {
        $template = DashboardTemplates::get($key);
        $sources = app(SourceRegistry::class);
        $allowed = array_map(fn ($source) => $source->key(), $sources->availableTo($user, DashboardScope::for($user)));

        $template['widgets'] = array_values(array_filter(
            $template['widgets'],
            fn (array $widget) => in_array($widget['spec']['source'], $allowed, true),
        ));

        return $template;
    }

    /** @return Collection<int, Dashboard> */
    private function visibleTo(User $user): Collection
    {
        // Dashboards per institution are few, so shared ones are matched in PHP; this keeps the
        // JSON matching portable between MySQL and SQLite.
        return Dashboard::query()
            ->with('owner:id,name')
            ->where(fn ($query) => $query->where('owner_id', $user->id)
                ->orWhereNotNull('shared_roles')
                ->orWhereNotNull('shared_designation_ids'))
            ->orderByDesc('updated_at')
            ->get()
            ->filter(fn (Dashboard $dashboard) => $dashboard->isVisibleTo($user))
            ->values();
    }

    private function clearHome(User $user): void
    {
        Dashboard::query()->where('owner_id', $user->id)->where('is_home', true)->update(['is_home' => false]);
    }
}
