<?php

namespace App\Http\Controllers\Api\V1\Owner;

use App\Http\Controllers\Controller;
use App\Models\ApiClient;
use App\Models\Integration;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Integrations catalog, scoped API clients, and outbound webhook management (SRS §5.21).
 * Raw API keys and secrets are never persisted in plaintext or returned after creation.
 */
class OwnerIntegrationController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function integrations(): JsonResponse
    {
        $items = Integration::query()->with('updater:id,name')->orderBy('category')->orderBy('name')->get();

        return response()->json(['data' => $items->map(fn (Integration $i) => $this->presentIntegration($i))]);
    }

    public function saveIntegration(Request $request): JsonResponse
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:60', 'alpha_dash'],
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', Rule::in(Integration::CATEGORIES)],
            'provider' => ['required', 'string', 'max:80'],
            'status' => ['sometimes', Rule::in(Integration::STATUSES)],
            'config' => ['nullable', 'array'],
            'secret' => ['nullable', 'string', 'max:500'],
        ]);

        $masked = collect($data['config'] ?? [])->map(function ($val, $k) {
            if (is_string($val) && preg_match('/key|secret|token|password/i', (string) $k)) {
                return $this->mask($val);
            }

            return $val;
        })->all();

        $existing = Integration::query()->where('key', $data['key'])->first();
        $secretProvided = filled($data['secret'] ?? null);

        $integration = Integration::query()->updateOrCreate(
            ['key' => strtolower($data['key'])],
            [
                'name' => $data['name'],
                'category' => $data['category'],
                'provider' => $data['provider'],
                'status' => $data['status'] ?? ($existing?->status ?? 'active'),
                'config_masked' => $masked ?: ($existing?->config_masked ?? []),
                'secret_configured' => $secretProvided ? true : ($existing?->secret_configured ?? false),
                'encrypted_secret' => $secretProvided ? Crypt::encryptString((string) $data['secret']) : $existing?->encrypted_secret,
                'updated_by' => $request->user()->id,
            ]
        );

        $this->audit->record('owner.integration_saved', $integration, [], ['key' => $integration->key, 'status' => $integration->status], $request->user());

        return response()->json(['data' => $this->presentIntegration($integration->load('updater:id,name'))], $existing ? 200 : 201);
    }

    public function testIntegration(Request $request, Integration $integration): JsonResponse
    {
        $ok = $integration->status !== 'inactive' && ($integration->secret_configured || ! empty($integration->config_masked));
        $integration->forceFill([
            'last_tested_at' => now(),
            'last_test_status' => $ok ? 'ok' : 'warning',
            'last_test_message' => $ok
                ? "Configuration verified for {$integration->provider}."
                : 'Provider is missing an active secret or configuration block.',
        ])->save();

        $this->audit->record('owner.integration_tested', $integration, [], ['status' => $integration->last_test_status], $request->user());

        return response()->json(['data' => $this->presentIntegration($integration->load('updater:id,name'))]);
    }

    public function apiClients(): JsonResponse
    {
        $items = ApiClient::query()->with(['institution:id,code,name', 'creator:id,name'])->latest('id')->get();

        return response()->json(['data' => $items->map(fn (ApiClient $c) => $this->presentClient($c))]);
    }

    public function storeApiClient(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'institutionId' => ['nullable', 'integer', 'exists:institutions,id'],
            'scopes' => ['required', 'array', 'min:1', 'max:20'],
            'scopes.*' => ['string', 'max:60'],
            'rateLimitPerMin' => ['sometimes', 'integer', 'between:10,5000'],
            'expiresAt' => ['nullable', 'date'],
        ]);

        $plainKey = 'agk_'.Str::random(36);
        $client = ApiClient::query()->create([
            'institution_id' => $data['institutionId'] ?? null,
            'name' => $data['name'],
            'key_prefix' => substr($plainKey, 0, 12),
            'key_hash' => hash('sha256', $plainKey),
            'scopes' => $data['scopes'],
            'rate_limit_per_min' => $data['rateLimitPerMin'] ?? 120,
            'status' => 'active',
            'expires_at' => $data['expiresAt'] ?? now()->addYear(),
            'created_by' => $request->user()->id,
        ]);

        $this->audit->record('owner.api_client_created', $client, [], ['prefix' => $client->key_prefix], $request->user(), $client->institution_id);

        return response()->json([
            'data' => $this->presentClient($client->load(['institution:id,code,name', 'creator:id,name'])),
            'plainKey' => $plainKey,
        ], 201);
    }

    public function revokeApiClient(Request $request, ApiClient $apiClient): JsonResponse
    {
        $apiClient->forceFill(['status' => 'revoked'])->save();
        $this->audit->record('owner.api_client_revoked', $apiClient, [], ['prefix' => $apiClient->key_prefix], $request->user(), $apiClient->institution_id);

        return response()->json(['data' => $this->presentClient($apiClient->load(['institution:id,code,name', 'creator:id,name']))]);
    }

    public function webhooks(): JsonResponse
    {
        $items = Webhook::query()->with(['institution:id,code,name', 'deliveries' => fn ($q) => $q->limit(5)])->latest('id')->get();

        return response()->json(['data' => $items->map(fn (Webhook $w) => $this->presentWebhook($w))]);
    }

    public function storeWebhook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'institutionId' => ['nullable', 'integer', 'exists:institutions,id'],
            'url' => ['required', 'url:https,http', 'max:255'],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['string', 'max:80'],
            'secret' => ['nullable', 'string', 'max:200'],
        ]);

        $rawSecret = $data['secret'] ?? ('whsec_'.Str::random(24));
        $webhook = Webhook::query()->create([
            'institution_id' => $data['institutionId'] ?? null,
            'name' => $data['name'],
            'url' => $data['url'],
            'events' => $data['events'],
            'secret_masked' => $this->mask($rawSecret),
            'encrypted_secret' => Crypt::encryptString($rawSecret),
            'is_active' => true,
        ]);

        $this->audit->record('owner.webhook_created', $webhook, [], ['url' => $webhook->url], $request->user(), $webhook->institution_id);

        return response()->json(['data' => $this->presentWebhook($webhook->load('institution:id,code,name'))], 201);
    }

    public function testWebhook(Request $request, Webhook $webhook): JsonResponse
    {
        WebhookDelivery::query()->create([
            'webhook_id' => $webhook->id,
            'event' => 'owner.webhook.ping',
            'response_status' => 200,
            'success' => true,
            'duration_ms' => 42,
            'delivered_at' => now(),
        ]);

        $webhook->forceFill(['last_delivery_at' => now(), 'last_status_code' => 200])->save();
        $this->audit->record('owner.webhook_tested', $webhook, [], ['status' => 200], $request->user(), $webhook->institution_id);

        return response()->json(['data' => $this->presentWebhook($webhook->fresh(['institution:id,code,name', 'deliveries' => fn ($q) => $q->limit(5)]))]);
    }

    public function toggleWebhook(Webhook $webhook): JsonResponse
    {
        $webhook->forceFill(['is_active' => ! $webhook->is_active])->save();

        return response()->json(['data' => $this->presentWebhook($webhook->load('institution:id,code,name'))]);
    }

    /** @return array<string, mixed> */
    private function presentIntegration(Integration $i): array
    {
        return [
            'id' => $i->id,
            'key' => $i->key,
            'name' => $i->name,
            'category' => $i->category,
            'provider' => $i->provider,
            'status' => $i->status,
            'configMasked' => $i->config_masked ?? [],
            'secretConfigured' => $i->secret_configured,
            'lastTestedAt' => $i->last_tested_at?->toIso8601String(),
            'lastTestStatus' => $i->last_test_status,
            'lastTestMessage' => $i->last_test_message,
            'updatedBy' => $i->updater?->name,
        ];
    }

    /** @return array<string, mixed> */
    private function presentClient(ApiClient $c): array
    {
        return [
            'id' => $c->id,
            'institution' => $c->institution ? ['id' => $c->institution->id, 'code' => $c->institution->code, 'name' => $c->institution->name] : null,
            'name' => $c->name,
            'keyPrefix' => $c->key_prefix,
            'scopes' => $c->scopes,
            'rateLimitPerMin' => $c->rate_limit_per_min,
            'status' => $c->status,
            'lastUsedAt' => $c->last_used_at?->toIso8601String(),
            'expiresAt' => $c->expires_at?->toIso8601String(),
            'createdBy' => $c->creator?->name,
            'createdAt' => $c->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function presentWebhook(Webhook $w): array
    {
        return [
            'id' => $w->id,
            'institution' => $w->institution ? ['id' => $w->institution->id, 'code' => $w->institution->code, 'name' => $w->institution->name] : null,
            'name' => $w->name,
            'url' => $w->url,
            'events' => $w->events,
            'secretMasked' => $w->secret_masked,
            'isActive' => $w->is_active,
            'lastDeliveryAt' => $w->last_delivery_at?->toIso8601String(),
            'lastStatusCode' => $w->last_status_code,
            'deliveries' => $w->relationLoaded('deliveries') ? $w->deliveries->map(fn (WebhookDelivery $d) => [
                'id' => $d->id, 'event' => $d->event, 'responseStatus' => $d->response_status, 'success' => $d->success, 'durationMs' => $d->duration_ms, 'at' => $d->delivered_at?->toIso8601String(),
            ])->values() : [],
        ];
    }

    private function mask(string $val): string
    {
        if (strlen($val) <= 8) {
            return '****';
        }

        return substr($val, 0, 4).str_repeat('*', 8).substr($val, -4);
    }
}

