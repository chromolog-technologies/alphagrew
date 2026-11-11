<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Validation\Rule;

/**
 * The signed-in user's in-app notifications (Laravel's notifications table) and their
 * per-category preferences. Works for every role.
 */
class NotificationController extends Controller
{
    /** GET /notifications?unread=1&page= */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unread' => ['nullable', 'boolean'],
            'perPage' => ['nullable', 'integer', 'between:1,50'],
        ]);
        $user = $request->user();

        $page = $user->notifications()
            ->when($request->boolean('unread'), fn ($query) => $query->whereNull('read_at'))
            ->paginate($validated['perPage'] ?? 20);

        return response()->json([
            'data' => collect($page->items())->map(fn (DatabaseNotification $notification) => $this->present($notification))->values(),
            'meta' => [
                'currentPage' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
                'total' => $page->total(),
                'unreadCount' => $user->unreadNotifications()->count(),
            ],
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['data' => $this->present($notification), 'unreadCount' => $request->user()->unreadNotifications()->count()]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['unreadCount' => 0]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->findOrFail($id)->delete();

        return response()->json(['unreadCount' => $request->user()->unreadNotifications()->count()]);
    }

    public function preferences(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->presentPreferences($request)]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => ['required', 'array'],
            'preferences.*.category' => ['required', 'distinct', Rule::in(array_keys(NotificationPreference::CATEGORIES))],
            'preferences.*.inApp' => ['required', 'boolean'],
            'preferences.*.mail' => ['required', 'boolean'],
        ]);

        foreach ($validated['preferences'] as $preference) {
            NotificationPreference::query()->updateOrCreate(
                ['user_id' => $request->user()->id, 'category' => $preference['category']],
                ['in_app' => $preference['inApp'], 'mail' => $preference['mail']],
            );
        }

        return response()->json(['data' => $this->presentPreferences($request)]);
    }

    /** @return list<array<string, mixed>> */
    private function presentPreferences(Request $request): array
    {
        return collect(NotificationPreference::CATEGORIES)
            ->map(function (array $category, string $key) use ($request) {
                [$label, $description] = $category;

                return ['category' => $key, 'label' => $label, 'description' => $description, ...NotificationPreference::for($request->user(), $key)];
            })
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function present(DatabaseNotification $notification): array
    {
        $data = $notification->data;

        return [
            'id' => $notification->id,
            'type' => class_basename($notification->type),
            // Older notifications (e.g. marks sent back) only have a message.
            'category' => $data['category'] ?? 'academics',
            'title' => $data['title'] ?? ($data['message'] ?? 'Notification'),
            'body' => $data['body'] ?? (isset($data['title']) ? null : ($data['remarks'] ?? null)),
            'link' => $data['link'] ?? null,
            'data' => $data,
            'readAt' => $notification->read_at?->toIso8601String(),
            'createdAt' => $notification->created_at?->toIso8601String(),
        ];
    }
}
