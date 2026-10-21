---
trigger: always_on
description: "Laravel project architecture, coding standards, security, and testing rules."
---

# Laravel Development Rules for Antigravity

## 1. Inspect Before Editing
- Read `composer.json`, `composer.lock`, the Laravel version, existing folder structure, routes, relevant tests, and project conventions before making changes.
- Follow the Laravel version already installed. Do not upgrade Laravel, PHP, or dependencies unless explicitly requested.
- Prefer the smallest safe change that solves the request. Explain the plan before broad refactors.
- Reuse existing patterns and packages. Do not introduce a new dependency without explaining why and asking for approval.

## 2. Laravel Architecture
- Keep HTTP controllers thin. Put reusable business logic in existing service/action classes when appropriate; do not create abstraction layers for trivial code.
- Use Eloquent models and relationships for database access. Avoid raw SQL unless it is justified and safely parameterized.
- Put request validation in Form Request classes for non-trivial endpoints; use clear validation rules and useful error messages.
- Use API Resources to shape API responses when the project follows that pattern.
- Use middleware for cross-cutting request checks and Policies/Gates for authorization.
- Use Jobs/Queues for genuinely long-running or asynchronous work when queue infrastructure exists.
- Keep routes organized in the existing `routes/` files. Use route names and route-model binding consistently with project conventions.
- Follow PSR-12 and the project's existing naming, formatting, and namespace conventions.
- Do not create folders or classes merely because they appear in a generic template. Create them when the feature needs them.

## 3. Security — Required
- Never expose `.env`, credentials, API keys, tokens, private storage files, or server-side source code in public responses.
- Never hardcode secrets. Use environment configuration and Laravel config files; application code should read values through `config()` rather than calling `env()` outside config files.
- Validate and authorize every state-changing request. Authentication alone is not authorization.
- Enforce ownership/tenant boundaries on every read, update, delete, export, and download operation.
- Use Eloquent/query-builder parameter binding. Never concatenate untrusted input into SQL, shell commands, file paths, or HTML.
- Escape output in Blade by default with `{{ }}`. Use `{!! !!}` only for trusted, sanitized HTML.
- Use CSRF protection for browser forms and secure session/cookie settings appropriate to deployment.
- Do not disable Laravel security middleware, password hashing, authorization, TLS verification, or validation to make a test pass.
- Store user uploads outside the public web root unless public access is intentional. Validate file type, size, and authorization; generate safe filenames.
- Do not log passwords, tokens, full payment details, or sensitive personal/health information.
- Use mass assignment protection (`$fillable` or `$guarded`) intentionally. Never pass unrestricted request data into model create/update calls.
- For APIs, return only fields the caller is allowed to see. Do not serialize sensitive model attributes.

## 4. Database and Migrations
- Inspect the current schema and existing migrations before changing database structure.
- Create migrations for schema changes; never silently edit an already-applied migration to change production schema.
- Use explicit foreign keys, indexes, nullability, and delete behavior where appropriate.
- Avoid destructive operations such as dropping columns/tables or deleting production data without explicit approval and a backup/rollback plan.
- Consider existing records and backward compatibility when changing columns or constraints.
- Use database transactions when multiple writes must succeed or fail together.
- Do not run migrations against production or any external database without explicit approval.

## 5. Configuration and Files
- Never overwrite user changes or unrelated files. Inspect diffs before modifying files that already contain work.
- Do not edit `vendor/` or generated dependency files manually.
- Do not commit `.env`, credentials, private keys, dumps, logs, or user data.
- Keep public assets in `public/`; keep application source code outside the public web root.
- Update `.env.example` with new configuration variable names only, using safe placeholder values.
- Do not claim that Laravel's `app/` directory is private unless the web server document root and deployment configuration are correctly set to `public/`.

## 6. Testing and Quality
- Add or update tests for new behavior, validation, authorization, and important edge cases.
- Prefer the test framework already configured in the project (usually PHPUnit or Pest).
- Run targeted tests first, then relevant broader tests when practical. Run formatting/static analysis tools only if installed/configured.
- Useful checks, where supported by the project:
  - `php artisan test`
  - `php artisan route:list`
  - `php artisan config:clear` only when relevant to diagnosing configuration caching
  - `composer validate`
- Never report a test as passing unless it was actually run and passed. State commands that could not be run and why.
- Do not use `migrate:fresh`, `db:wipe`, destructive seeders, or production-changing commands without explicit approval.

## 7. Required Completion Summary
At the end of a task, report:
1. What changed and why.
2. Files created or modified.
3. Validation and authorization added.
4. Tests and commands run, with real results.
5. Any migration, environment, queue, or deployment steps still required.
6. Risks or assumptions that need user confirmation.
