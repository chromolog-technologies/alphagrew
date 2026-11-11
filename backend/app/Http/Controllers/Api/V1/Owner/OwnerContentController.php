<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use App\Models\CmsRevision;
use App\Models\Institution;
use App\Models\PlatformAnnouncement;
use App\Models\ProductRelease;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Cross-tenant announcements (§5.18), platform CMS pages & revisions (§5.24),
 * and product release management (§5.25).
 */
class OwnerContentController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function announcements(Request $request): JsonResponse
    {
        $status = $request->validate(['status' => ['nullable', Rule::in(PlatformAnnouncement::STATUSES)]])['status'] ?? null;

        $items = PlatformAnnouncement::query()
            ->with('creator:id,name')
            ->when($status, fn ($q, string $s) => $q->where('status', $s))
            ->latest('id')->get();

        return response()->json(['data' => $items->map(fn (PlatformAnnouncement $a) => $this->presentAnnouncement($a))]);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:5000'],
            'category' => ['required', Rule::in(PlatformAnnouncement::CATEGORIES)],
            'priority' => ['required', Rule::in(PlatformAnnouncement::PRIORITIES)],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(PlatformAnnouncement::CHANNELS)],
            'targetScope' => ['required', Rule::in(PlatformAnnouncement::TARGET_SCOPES)],
            'targetInstitutionIds' => ['nullable', 'array'],
            'targetRoles' => ['nullable', 'array'],
            'status' => ['sometimes', Rule::in(['draft', 'scheduled', 'published'])],
            'scheduledAt' => ['nullable', 'date'],
        ]);

        $status = $data['status'] ?? 'draft';
        $delivered = $status === 'published' ? $this->recipientEstimate($data['targetScope'], $data['targetInstitutionIds'] ?? [], $data['targetRoles'] ?? []) : 0;

        $announcement = PlatformAnnouncement::query()->create([
            'title' => $data['title'],
            'body' => $data['body'],
            'category' => $data['category'],
            'priority' => $data['priority'],
            'channels' => $data['channels'],
            'target_scope' => $data['targetScope'],
            'target_institution_ids' => $data['targetInstitutionIds'] ?? [],
            'target_roles' => $data['targetRoles'] ?? [],
            'status' => $status,
            'scheduled_at' => $data['scheduledAt'] ?? null,
            'published_at' => $status === 'published' ? now() : null,
            'delivered_count' => $delivered,
            'failed_count' => 0,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->record('owner.announcement_saved', $announcement, [], ['title' => $announcement->title, 'status' => $announcement->status], $request->user());

        return response()->json(['data' => $this->presentAnnouncement($announcement->load('creator:id,name'))], 201);
    }

    public function updateAnnouncement(Request $request, PlatformAnnouncement $announcement): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'body' => ['sometimes', 'string', 'max:5000'],
            'status' => ['sometimes', Rule::in(PlatformAnnouncement::STATUSES)],
            'priority' => ['sometimes', Rule::in(PlatformAnnouncement::PRIORITIES)],
        ]);

        $nextStatus = $data['status'] ?? $announcement->status;
        $justPublished = $nextStatus === 'published' && ! $announcement->published_at;

        $announcement->forceFill([
            ...(isset($data['title']) ? ['title' => $data['title']] : []),
            ...(isset($data['body']) ? ['body' => $data['body']] : []),
            ...(isset($data['priority']) ? ['priority' => $data['priority']] : []),
            'status' => $nextStatus,
            ...($justPublished ? [
                'published_at' => now(),
                'delivered_count' => $this->recipientEstimate($announcement->target_scope, $announcement->target_institution_ids ?? [], $announcement->target_roles ?? []),
            ] : []),
        ])->save();

        $this->audit->record('owner.announcement_updated', $announcement, [], ['status' => $announcement->status], $request->user());

        return response()->json(['data' => $this->presentAnnouncement($announcement->load('creator:id,name'))]);
    }

    public function cmsPages(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'contentType' => ['nullable', Rule::in(CmsPage::TYPES)],
            'status' => ['nullable', Rule::in(CmsPage::STATUSES)],
        ]);

        $pages = CmsPage::query()
            ->with(['updater:id,name', 'revisions.editor:id,name'])
            ->when($filters['contentType'] ?? null, fn ($q, string $t) => $q->where('content_type', $t))
            ->when($filters['status'] ?? null, fn ($q, string $s) => $q->where('status', $s))
            ->latest('updated_at')
            ->get();

        return response()->json(['data' => $pages->map(fn (CmsPage $p) => $this->presentCmsPage($p))]);
    }

    public function storeCmsPage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'contentType' => ['required', Rule::in(CmsPage::TYPES)],
            'slug' => ['required', 'string', 'max:160', 'alpha_dash', 'unique:cms_pages,slug'],
            'title' => ['required', 'string', 'max:200'],
            'summary' => ['nullable', 'string', 'max:400'],
            'body' => ['required', 'string'],
            'seoTitle' => ['nullable', 'string', 'max:160'],
            'seoDescription' => ['nullable', 'string', 'max:320'],
            'status' => ['sometimes', Rule::in(CmsPage::STATUSES)],
            'scheduledAt' => ['nullable', 'date'],
        ]);

        $page = DB::transaction(function () use ($data, $request): CmsPage {
            $status = $data['status'] ?? 'draft';
            $p = CmsPage::query()->create([
                'content_type' => $data['contentType'],
                'slug' => strtolower($data['slug']),
                'title' => $data['title'],
                'summary' => $data['summary'] ?? null,
                'body' => $data['body'],
                'seo_title' => $data['seoTitle'] ?? null,
                'seo_description' => $data['seoDescription'] ?? null,
                'status' => $status,
                'scheduled_at' => $data['scheduledAt'] ?? null,
                'published_at' => $status === 'published' ? now() : null,
                'current_version' => 1,
                'updated_by' => $request->user()->id,
            ]);

            CmsRevision::query()->create([
                'cms_page_id' => $p->id,
                'version_number' => 1,
                'title' => $p->title,
                'body' => $p->body,
                'editor_id' => $request->user()->id,
                'change_note' => 'Initial draft',
                'created_at' => now(),
            ]);

            return $p;
        });

        $this->audit->record('owner.cms_page_created', $page, [], ['slug' => $page->slug, 'status' => $page->status], $request->user());

        return response()->json(['data' => $this->presentCmsPage($page->load(['updater:id,name', 'revisions.editor:id,name']))], 201);
    }

    public function updateCmsPage(Request $request, CmsPage $cmsPage): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'summary' => ['nullable', 'string', 'max:400'],
            'body' => ['sometimes', 'string'],
            'seoTitle' => ['nullable', 'string', 'max:160'],
            'seoDescription' => ['nullable', 'string', 'max:320'],
            'status' => ['sometimes', Rule::in(CmsPage::STATUSES)],
            'scheduledAt' => ['nullable', 'date'],
            'changeNote' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($cmsPage, $data, $request): void {
            $nextVersion = $cmsPage->current_version + 1;
            $nextStatus = $data['status'] ?? $cmsPage->status;

            $cmsPage->forceFill([
                'title' => $data['title'] ?? $cmsPage->title,
                'summary' => array_key_exists('summary', $data) ? $data['summary'] : $cmsPage->summary,
                'body' => $data['body'] ?? $cmsPage->body,
                'seo_title' => array_key_exists('seoTitle', $data) ? $data['seoTitle'] : $cmsPage->seo_title,
                'seo_description' => array_key_exists('seoDescription', $data) ? $data['seoDescription'] : $cmsPage->seo_description,
                'status' => $nextStatus,
                'scheduled_at' => array_key_exists('scheduledAt', $data) ? $data['scheduledAt'] : $cmsPage->scheduled_at,
                'published_at' => $nextStatus === 'published' && ! $cmsPage->published_at ? now() : $cmsPage->published_at,
                'current_version' => $nextVersion,
                'updated_by' => $request->user()->id,
            ])->save();

            CmsRevision::query()->create([
                'cms_page_id' => $cmsPage->id,
                'version_number' => $nextVersion,
                'title' => $cmsPage->title,
                'body' => $cmsPage->body,
                'editor_id' => $request->user()->id,
                'change_note' => $data['changeNote'] ?? 'Updated content',
                'created_at' => now(),
            ]);
        });

        $this->audit->record('owner.cms_page_updated', $cmsPage, [], ['version' => $cmsPage->current_version, 'status' => $cmsPage->status], $request->user());

        return response()->json(['data' => $this->presentCmsPage($cmsPage->fresh(['updater:id,name', 'revisions.editor:id,name']))]);
    }

    public function releases(): JsonResponse
    {
        $items = ProductRelease::query()->with('creator:id,name')->latest('id')->get();

        return response()->json(['data' => $items->map(fn (ProductRelease $r) => $this->presentRelease($r))]);
    }

    public function storeRelease(Request $request): JsonResponse
    {
        $data = $request->validate([
            'version' => ['required', 'string', 'max:40', 'unique:product_releases,version'],
            'title' => ['required', 'string', 'max:200'],
            'releaseType' => ['required', Rule::in(ProductRelease::RELEASE_TYPES)],
            'releaseDate' => ['nullable', 'date'],
            'deploymentStatus' => ['sometimes', Rule::in(ProductRelease::DEPLOYMENT_STATUSES)],
            'publicationStatus' => ['sometimes', Rule::in(ProductRelease::PUBLICATION_STATUSES)],
            'features' => ['nullable', 'array'],
            'fixes' => ['nullable', 'array'],
            'affectedModules' => ['nullable', 'array'],
            'targetScope' => ['sometimes', Rule::in(['all', 'institutions'])],
            'targetInstitutionIds' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
        ]);

        $release = ProductRelease::query()->create([
            'version' => $data['version'],
            'title' => $data['title'],
            'release_type' => $data['releaseType'],
            'release_date' => $data['releaseDate'] ?? now()->toDateString(),
            'deployment_status' => $data['deploymentStatus'] ?? 'planned',
            'publication_status' => $data['publicationStatus'] ?? 'draft',
            'features' => $data['features'] ?? [],
            'fixes' => $data['fixes'] ?? [],
            'affected_modules' => $data['affectedModules'] ?? [],
            'target_scope' => $data['targetScope'] ?? 'all',
            'target_institution_ids' => $data['targetInstitutionIds'] ?? [],
            'notes' => $data['notes'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        $this->audit->record('owner.release_created', $release, [], ['version' => $release->version], $request->user());

        return response()->json(['data' => $this->presentRelease($release->load('creator:id,name'))], 201);
    }

    public function updateRelease(Request $request, ProductRelease $release): JsonResponse
    {
        $data = $request->validate([
            'deploymentStatus' => ['sometimes', Rule::in(ProductRelease::DEPLOYMENT_STATUSES)],
            'publicationStatus' => ['sometimes', Rule::in(ProductRelease::PUBLICATION_STATUSES)],
            'releaseDate' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $before = $release->only(['deployment_status', 'publication_status']);
        $release->update([
            ...(isset($data['deploymentStatus']) ? ['deployment_status' => $data['deploymentStatus']] : []),
            ...(isset($data['publicationStatus']) ? ['publication_status' => $data['publicationStatus']] : []),
            ...(array_key_exists('releaseDate', $data) ? ['release_date' => $data['releaseDate']] : []),
            ...(array_key_exists('notes', $data) ? ['notes' => $data['notes']] : []),
        ]);

        $this->audit->record('owner.release_updated', $release, $before, $release->only(['deployment_status', 'publication_status']), $request->user());

        return response()->json(['data' => $this->presentRelease($release->load('creator:id,name'))]);
    }

    /** @param list<int> $instIds @param list<string> $roles */
    private function recipientEstimate(string $scope, array $instIds, array $roles): int
    {
        return User::query()->withoutGlobalScopes()->whereNull('deleted_at')
            ->when($scope === 'institutions' && $instIds !== [], fn ($q) => $q->whereIn('institution_id', $instIds))
            ->when($scope === 'roles' && $roles !== [], fn ($q) => $q->whereIn('role', $roles))
            ->count();
    }

    /** @return array<string, mixed> */
    private function presentAnnouncement(PlatformAnnouncement $a): array
    {
        return [
            'id' => $a->id,
            'title' => $a->title,
            'body' => $a->body,
            'category' => $a->category,
            'priority' => $a->priority,
            'channels' => $a->channels,
            'targetScope' => $a->target_scope,
            'targetInstitutionIds' => $a->target_institution_ids ?? [],
            'targetRoles' => $a->target_roles ?? [],
            'status' => $a->status,
            'scheduledAt' => $a->scheduled_at?->toIso8601String(),
            'publishedAt' => $a->published_at?->toIso8601String(),
            'deliveredCount' => $a->delivered_count,
            'failedCount' => $a->failed_count,
            'createdBy' => $a->creator?->name,
            'createdAt' => $a->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentCmsPage(CmsPage $p): array
    {
        return [
            'id' => $p->id,
            'contentType' => $p->content_type,
            'slug' => $p->slug,
            'title' => $p->title,
            'summary' => $p->summary,
            'body' => $p->body,
            'seoTitle' => $p->seo_title,
            'seoDescription' => $p->seo_description,
            'status' => $p->status,
            'scheduledAt' => $p->scheduled_at?->toIso8601String(),
            'publishedAt' => $p->published_at?->toIso8601String(),
            'currentVersion' => $p->current_version,
            'updatedBy' => $p->updater?->name,
            'revisions' => $p->relationLoaded('revisions') ? $p->revisions->map(fn (CmsRevision $r) => [
                'id' => $r->id,
                'versionNumber' => $r->version_number,
                'title' => $r->title,
                'changeNote' => $r->change_note,
                'editor' => $r->editor?->name,
                'at' => $r->created_at?->toIso8601String(),
            ])->values() : [],
            'updatedAt' => $p->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentRelease(ProductRelease $r): array
    {
        return [
            'id' => $r->id,
            'version' => $r->version,
            'title' => $r->title,
            'releaseType' => $r->release_type,
            'releaseDate' => $r->release_date?->toDateString(),
            'deploymentStatus' => $r->deployment_status,
            'publicationStatus' => $r->publication_status,
            'features' => $r->features ?? [],
            'fixes' => $r->fixes ?? [],
            'affectedModules' => $r->affected_modules ?? [],
            'targetScope' => $r->target_scope,
            'targetInstitutionIds' => $r->target_institution_ids ?? [],
            'notes' => $r->notes,
            'createdBy' => $r->creator?->name,
            'createdAt' => $r->created_at?->toIso8601String(),
        ];
    }
}

