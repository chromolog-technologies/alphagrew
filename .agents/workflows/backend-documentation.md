---
title: Backend Documentation
description: Document a Laravel module against routes, code, and the existing specs without changing product behavior.
---

# Backend Documentation

Use this procedure when a backend module is added, a spec is updated, or the code and a spec disagree. This workflow records what the API actually does. It does not implement features. Implementation follows `laravel-feature.md`.

## Step 1 — Name the module
- State the module, the route prefix, and the spec that should cover it.
- Specs live in `documentation/` and `documentation/prd/`. The layer map is `backend/ARCHITECTURE.md`. The gap register is `documentation/gaps/backend-gaps.md`.
- If no spec exists, say so. Do not invent a target design to fill the hole.

## Step 2 — Read the code
- Read the route group in `backend/routes/api.php`, including middleware (`auth:sanctum`, `tenant`, `permission:`, `sample-data`).
- Read the controller, FormRequest, Action, Resource, Policy, migration, and feature test for that group.
- Check `backend/app/Http/Middleware/MarkSampleData.php` before treating a route as persisted. Routes inside a `sample-data` group return hardcoded payloads and do not write tables.

## Step 3 — Classify every endpoint
Give each route one status:

| Status | Meaning |
|---|---|
| Implemented | Route, persistence, and a feature test exist, and the route is outside `sample-data`. |
| Sample data | The route is wrapped in `sample-data`, or the controller returns a fixed payload. |
| Spec only | A journey spec or PRD addendum describes the endpoint, and `routes/api.php` does not register it. |
| Code without a spec | The route exists and no module spec describes it. |

Do not mark a sample-data route as implemented.

## Step 4 — Update the matching spec
- If a status matrix exists (placement officer, recruiter), update the "Today" column to match the classification.
- If the module has no spec, add a row to `documentation/gaps/backend-gaps.md` instead of drafting a new target architecture.
- Do not rewrite the target design in the journey specs. Those documents stay the product target.

## Step 5 — Update the architecture note
When a module moves into Actions, FormRequests, Resources, or Policies, update the folder table and the "Not yet moved" list in `backend/ARCHITECTURE.md`. Leave that list unchanged when the controller still validates and writes inline.

## Step 6 — Record the gap
Add or update a row in `documentation/gaps/backend-gaps.md` with:

- Route and HTTP method.
- Controller class.
- Status from Step 3.
- Spec section, or "no module spec".
- The duplicate path, when a real route and a sample-data route cover the same job.

## Step 7 — Report
State what was documented, which files changed, and which endpoints are still sample data or spec-only. Do not claim a module is done because a route exists.
