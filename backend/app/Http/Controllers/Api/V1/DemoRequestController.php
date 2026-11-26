<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Notifications\DemoRequested;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;

/**
 * POST /demo-requests: the public website's "Book a demo" form. Each request becomes a new
 * Owner Console lead (source "website", stage "new") and is emailed to the sales inbox.
 * Public and unauthenticated, so it is rate limited and has a honeypot field for bots.
 */
class DemoRequestController extends Controller
{
    public const ROLES = ['Principal or director', 'Training and placement officer', 'Head of department', 'Faculty or trainer', 'Recruiter', 'Student', 'Other'];

    public const SIZES = ['Under 500', '500 to 2,000', '2,000 to 5,000', 'Over 5,000'];

    /** A rough student count per size band, so the CRM can sort and filter leads. */
    private const SIZE_ESTIMATE = ['Under 500' => 250, '500 to 2,000' => 1000, '2,000 to 5,000' => 3500, 'Over 5,000' => 6000];

    public function store(Request $request): JsonResponse
    {
        // Bots fill every field; people never see this one. Answer as if it worked.
        if (filled($request->input('website'))) {
            return response()->json(['message' => 'Thank you. We will be in touch soon.'], 201);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'institution' => ['required', 'string', 'max:180'],
            'role' => ['required', 'string', Rule::in(self::ROLES)],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\-\s]{6,40}$/'],
            'size' => ['nullable', 'string', Rule::in(self::SIZES)],
            'interests' => ['sometimes', 'array', 'max:6'],
            'interests.*' => ['string', 'max:60'],
            'message' => ['nullable', 'string', 'max:2000'],
        ], [
            'phone.regex' => 'Enter a phone number using digits, spaces and + only.',
        ]);

        $size = $data['size'] ?? null;
        $details = [
            'role' => $data['role'],
            'size' => $size,
            'interests' => array_values($data['interests'] ?? []),
            'message' => $data['message'] ?? null,
        ];

        $lead = Lead::query()->create([
            'organization_name' => trim($data['institution']),
            'contact_name' => trim($data['name']),
            'contact_email' => strtolower(trim($data['email'])),
            'contact_phone' => isset($data['phone']) ? trim($data['phone']) : null,
            'source' => 'website',
            'stage' => 'new',
            'expected_students' => $size ? self::SIZE_ESTIMATE[$size] : null,
            'next_follow_up_at' => now()->addDay(),
            'notes' => $this->notes($details),
        ]);

        try {
            Notification::route('mail', (string) config('app.demo_requests_email'))->notify(new DemoRequested($lead, $details));
        } catch (\Throwable $e) {
            // The lead is saved, so sales still sees it in the Owner Console.
            Log::warning('Demo request email could not be queued.', ['lead' => $lead->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['message' => 'Thank you. We will be in touch soon.'], 201);
    }

    /** @param  array{role: string, size: ?string, interests: list<string>, message: ?string}  $details */
    private function notes(array $details): string
    {
        return collect([
            'Website demo request.',
            'Role: '.$details['role'],
            $details['size'] ? 'Final and pre-final year students: '.$details['size'] : null,
            $details['interests'] !== [] ? 'Interested in: '.implode(', ', $details['interests']) : null,
            $details['message'] ? "Message:\n".$details['message'] : null,
        ])->filter()->implode("\n");
    }
}
