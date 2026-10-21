---
title: Laravel Feature Implementation
description: Safely implement a Laravel feature from requirements through tests and review.
---

# Laravel Feature Implementation

Use this procedure whenever implementing a new feature or a meaningful change in an existing Laravel project.

## Step 1 — Understand the request
- Restate the expected behavior and identify user roles, inputs, outputs, and failure cases.
- Ask a concise question if a missing requirement affects security, data integrity, or the intended behavior. Otherwise state reasonable assumptions and proceed.
- Do not expand the scope beyond the request.

## Step 2 — Inspect the project
- Read `composer.json` and identify the installed Laravel and PHP versions.
- Inspect relevant routes, controllers, models, migrations, Form Requests, policies, resources, views, frontend code, and tests.
- Follow existing project conventions and verify whether a similar feature already exists.
- Check the working tree/diff before editing so existing user changes are preserved.

## Step 3 — Propose the implementation
- List the files likely to change and the purpose of each.
- Describe the request flow: route → middleware/authentication → validation → authorization → business logic → persistence → response.
- Identify security concerns, schema changes, backward-compatibility risks, and tests.
- Get approval before destructive changes, production operations, new paid services, or dependency upgrades.

## Step 4 — Implement in small steps
- Add or update routes using existing route conventions.
- Validate inputs with Form Requests or the project's established validation approach.
- Enforce authentication and resource-level authorization; check ownership/tenant boundaries.
- Put business logic in the appropriate existing service/action/model layer without overengineering.
- Add migrations for schema changes and make them safe for existing data.
- Return only authorized fields. Use API Resources or existing response conventions.
- Update views/frontend only when required.
- Never expose secrets, internal exceptions, private files, or sensitive model attributes.

## Step 5 — Test
- Add tests for success cases, validation failures, unauthenticated access, unauthorized access, missing records, and important edge cases.
- Run the most targeted relevant tests, then broader tests when practical.
- Run formatting/static analysis tools if configured.
- If a command cannot run because of missing services, environment variables, or dependencies, report that accurately; do not fabricate results.
- Never run destructive database commands or target production without explicit approval.

## Step 6 — Review the diff
- Inspect every changed file and remove unrelated edits, debug statements, temporary code, and unused imports.
- Check for SQL injection, mass assignment, broken authorization, XSS, CSRF, insecure uploads, secret leakage, N+1 queries, and unsafe error messages.
- Confirm migrations and environment changes are documented.
- Ensure the implementation matches the original request.

## Step 7 — Report completion
Provide a concise summary containing:
- Behavior implemented.
- Files changed.
- Security and validation decisions.
- Tests/commands executed and actual outcomes.
- Required environment, migration, queue, or deployment steps.
- Remaining limitations or questions.

Do not say the feature is complete if critical tests or required steps remain unverified.
