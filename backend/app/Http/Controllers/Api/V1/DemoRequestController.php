<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\SalesActivity;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * "Book a demo" and "Get in touch" forms on the public marketing site.
 *
 * Each request becomes a CRM Lead (source "website", stage "new") in the Owner Console's
 * sales pipeline, with the visitor's answers kept as the lead's notes and first activity.
 * Public and unauthenticated: throttled per address, and a hidden "website" field that
 * people never see but form-filling bots do is silently accepted and dropped.
 */
class DemoRequestController extends Controller
{
    public function __construct(private readonly AuditLogger $audit)
    {
    }

    public function store(Request $request): JsonResponse
    {
        // Honeypot: pretend success so bots don't learn to skip the field.
        if (filled($request->input('website'))) {
            return response()->json(['message' => 'Thanks. We will be in touch shortly.'], 201);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'institution' => ['nullable', 'string', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'role' => ['nullable', 'string', 'max:80'],
            'size' => ['nullable', 'string', 'max:40'],
            'interests' => ['nullable', 'array', 'max:10'],
            'interests.*' => ['string', 'max:80'],
            'message' => ['nullable', 'string', 'max:2000'],
            // Which form sent it: the full Contact page form or the short home page form.
            'form' => ['nullable', 'in:demo,get_in_touch'],
        ]);

        $details = array_filter([
            'Form' => ($data['form'] ?? 'demo') === 'get_in_touch' ? 'Home page "Get in touch"' : 'Contact page demo request',
            'Role' => $data['role'] ?? null,
            'Final and pre-final year students' => $data['size'] ?? null,
            'Interested in' => ! empty($data['interests']) ? implode(', ', $data['interests']) : null,
            'Message' => $data['message'] ?? null,
        ], fn ($value) => filled($value));

        $notes = collect($details)->map(fn ($value, $label) => "{$label}: {$value}")->implode("\n");

        $lead = DB::transaction(function () use ($data, $notes): Lead {
            $lead = Lead::query()->create([
                'organization_name' => filled($data['institution'] ?? null) ? $data['institution'] : 'Not given',
                'contact_name' => $data['name'],
                'contact_email' => strtolower($data['email']),
                'contact_phone' => $data['phone'] ?? null,
                'source' => 'website',
                'stage' => 'new',
                'next_follow_up_at' => now()->addDay(),
                'notes' => $notes,
            ]);

            SalesActivity::query()->create([
                'lead_id' => $lead->id,
                'activity_type' => 'note',
                'summary' => 'Submitted from the public website',
                'outcome' => null,
                'occurred_at' => now(),
                'actor_id' => null,
            ]);

            return $lead;
        });

        $this->audit->record('public.demo_requested', $lead, [], ['organization' => $lead->organization_name]);

        return response()->json(['message' => 'Thanks. We will be in touch shortly.'], 201);
    }
}
