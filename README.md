# Alphagrew

Alphagrew is a multi-tenant campus management and career readiness platform. It covers institution setup, students and staff, attendance, marks and result publishing, placement drives, resume analysis and AI mock interviews.

The repository holds two applications:

| Folder | What it is | Stack |
|---|---|---|
| [backend/](backend/) | REST API under `/api/v1` | PHP 8.2+, Laravel 12, Sanctum (token auth), Spatie Permission (roles), MySQL or SQLite |
| [frontend/](frontend/) | Single-page web app for every role | React 19, TypeScript, Vite 6, Tailwind CSS 4, TanStack Query, Vitest |

There is no mobile app. Students, staff, placement officers, admins and recruiters all use the web app.

---

## Prerequisites

- PHP 8.2 or newer with `mbstring`, `pdo_mysql` (or `pdo_sqlite`) and `fileinfo`
- Composer 2
- Node.js 22 and npm
- MySQL 8 (XAMPP works), or SQLite for a quick start
- Optional: [poppler](https://poppler.freedesktop.org/) `pdftotext`, for better text extraction from PDF resumes

## Quick start

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Set the database in `backend/.env`. The defaults expect a local MySQL database named `alphagrew` with user `root` and no password, so create that database first. To use SQLite instead, set `DB_CONNECTION=sqlite` and remove the other `DB_*` lines.

```bash
php artisan migrate --seed     # creates tables, roles/permissions and demo data
php artisan serve              # API on http://127.0.0.1:8000
```

In a second terminal, run the queue worker. Resume parsing, interview evaluation, readiness scores and academic summaries all run as queued jobs:

```bash
php artisan queue:work
```

For idle-interview cleanup and token pruning, also run the scheduler (`php artisan schedule:work`) or add `php artisan schedule:run` to cron.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env           # keep VITE_API_BASE_URL="/api/v1"
npm run dev                    # http://localhost:5173
```

With `VITE_API_BASE_URL="/api/v1"`, the Vite dev server proxies `/api` to `LARAVEL_DEV_URL` (default `http://127.0.0.1:8000`), so no CORS setup is needed locally.

### 3. Sign in

The seeder creates these demo accounts, all with password `demo123`:

| Email | Role |
|---|---|
| `admin@demo.com` | Institution admin (Management dashboard) |
| `placement@demo.com` | Placement officer |
| `hod.cse@demo.com` | Head of Department, CSE (HOD dashboard) |
| `exam@demo.com` | Exam coordinator (Examination dashboard) |
| `staff@demo.com` | Faculty, CSE (Teacher dashboard) |
| `ece.faculty@demo.com`, `me.faculty@demo.com`, `mba.faculty@demo.com` | Faculty for ECE, ME and MBA |
| `student@demo.com` | Student (Student dashboard) |

The dev server also shows a demo-account picker on the login page.

Besides people and placement drives, the seed includes academic records, from `AcademicDemoSeeder`, so the dashboards have data:
- a course and six subjects per department, with teachers assigned
- two published terms (2025-26), with SGPA, CGPA and backlogs calculated by the real publishing flow
- the current term: attendance up to 6 November 2026, mid-term marks at every review stage, and upcoming end-semester exams

`POST /api/v1/campus/reset` rebuilds the same data. Tests skip `AcademicDemoSeeder` unless they seed it explicitly.

Super Admin accounts are not created by the seeder or the API. Create one from the command line:

```bash
php artisan alphagrew:super-admin you@example.com "Your Name" --password=secret123
```

## Configuration

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `APP_DEBUG` | `false` by default. Set to `true` only on your own machine. |
| `FRONTEND_URL` | URL of the React app. Links in password-reset and invitation emails point here. |
| `SANCTUM_EXPIRATION` | API token lifetime in minutes (default 720). |
| `DEMO_RESET_ENABLED` | Allows `POST /api/v1/campus/reset` to wipe and re-seed demo data. Unset means on only for `local`/`testing`. Never enable in production. |
| `QUEUE_CONNECTION` | `database` by default. A worker must be running. |
| `MAIL_MAILER` | `log` by default, so emails are written to `storage/logs/laravel.log`. |
| `ANTHROPIC_API_KEY`, `AI_CHAIN`, `AI_TIMEOUT` | AI interview and resume analysis. Without a key, every stage falls back to its built-in deterministic engine, so the app still works offline. |
| `PDFTOTEXT_PATH` | Path to the `pdftotext` binary (optional). |
| `AI_TRANSCRIPTION_URL`, `AI_TRANSCRIPTION_KEY`, `AI_TRANSCRIPTION_MODEL` | OpenAI-compatible transcription endpoint for voice answers in interviews (optional). |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | API base URL. Use `/api/v1` locally (proxied); use the full API URL in production builds. |
| `VITE_DEMO_MODE` | `true` runs the app offline on sample data and allows building without an API URL. Production builds fail if both this and `VITE_API_BASE_URL` are unset. |
| `LARAVEL_DEV_URL` | Proxy target for the dev server. |

Never put AI provider keys in a `VITE_` variable: anything with that prefix is bundled into the browser build.

## Common commands

| Where | Command | Does |
|---|---|---|
| backend | `php artisan test` | Runs the PHPUnit suite (in-memory SQLite) |
| backend | `./vendor/bin/pint` | Formats PHP code |
| backend | `php artisan migrate:fresh --seed` | Rebuilds the database with demo data |
| backend | `php artisan route:list --path=api` | Lists API endpoints |
| backend | `composer dev` | Runs server, queue, log viewer and Vite together |
| frontend | `npm run dev` | Dev server with hot reload |
| frontend | `npm run lint` | TypeScript type check (`tsc --noEmit`) |
| frontend | `npm test` | Runs Vitest tests |
| frontend | `npm run build` | Production build into `frontend/dist` |
| frontend | `npm run dev:api` | Starts the Laravel server from the frontend folder |

## Project layout

```
backend/
  app/
    Actions/        Business operations (marks, interviews, placement, students, ...)
    Http/           Controllers (Api/V1, Api/Staff, Api/Student), requests, middleware
    Jobs/           Queued work: resume parsing/analysis, interview evaluation, readiness
    Models/         Eloquent models, scoped to the current institution
    Services/       AI, academics, resumes, skills, tenancy, audit
  database/         Migrations, factories and seeders
  routes/api.php    All API routes
  tests/Feature/    API and domain tests
frontend/
  src/
    api/            API client
    components/     Screens and UI kit, grouped by role and feature
    hooks/          Shared hooks (usePermissions for role-based UI)
documentation/      Product, API and design documents (see below)
```

### Multi-tenancy and roles

Every request is bound to one institution by the `SetTenant` middleware, and tenant models are filtered automatically by `InstitutionScope`. There are six roles: `super_admin`, `institution_admin`, `placement_officer`, `staff`, `student` and `recruiter`. Fine-grained permissions come from Spatie Permission and are seeded by `SpatiePermissionsSeeder`. Staff designations (HOD, exam coordinator and so on) add permissions on top of the `staff` role.

### Dashboards and custom fields

Each role opens on a built-in dashboard template: Student, Teacher, HOD, Examination or Management. Users can copy a template and change it, or build their own dashboards from widgets (numbers, bar, line and pie charts, tables and lists). Admins can share a dashboard with roles or designations and make it their default.

Widgets never send SQL. Each one is a JSON spec, checked against a whitelist of data sources in `backend/app/Services/Dashboards/`. Every query runs within the viewer's own scope, whoever built the dashboard (`DashboardScope`):
- students see only their own published records
- teachers see only their allocated subjects
- HODs see only their department
- exam coordinators and admins see the whole institution

Admins can add **custom fields** to students, staff, subjects and exams (Master Data → Custom Fields). They appear on forms and in the widget builder, so dashboards can group and filter by them.

## Testing and CI

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs on every pull request and on pushes to `main`:

1. Backend tests on SQLite (`php artisan test`)
2. Migrations on MySQL 8: migrate with seed, roll back one step, then migrate again
3. Frontend: type check, tests and production build

Run the same checks locally before opening a PR. If you add a migration, make sure its `down()` method works, because CI rolls it back.

## Deployment

- **Backend**: [backend/Dockerfile](backend/Dockerfile) builds a production PHP 8.4 image. One container runs Apache with OPcache, the queue worker and the scheduler under supervisord ([backend/docker/](backend/docker/)). At start it migrates, seeds roles and permissions, and builds the config, route, event and view caches. It listens on `$PORT` (default 10000) and reports health at `/up`. Set `APP_KEY`, the `DB_*` variables, `FRONTEND_URL`, `APP_URL`, mail settings and `ANTHROPIC_API_KEY`; keep `DEMO_SEED_ENABLED` and `DEMO_RESET_ENABLED` off in production. Under heavy load, run the queue worker as its own service instead.
- **Frontend**: [frontend/vercel.json](frontend/vercel.json) configures a Vercel deployment with SPA rewrites, long-lived caching for hashed assets, and security headers (Content Security Policy, HSTS, `X-Frame-Options`, `Permissions-Policy` allowing the microphone for voice interviews). Set `VITE_API_BASE_URL` to the deployed API URL at build time.
- **CORS**: the API accepts browser requests only from `CORS_ALLOWED_ORIGINS` (comma-separated; defaults to `FRONTEND_URL`) and exposes `Content-Disposition`, `X-Data-Source`, `Deprecation` and `Link` to the app ([backend/config/cors.php](backend/config/cors.php)).

## Documentation

| Document | Contents |
|---|---|
| [documentation/PRD.md](documentation/PRD.md) | Product requirements, architecture and delivery plan |
| [documentation/api/](documentation/api/README.md) | Endpoint reference for every module, with conventions, errors and known issues |
| [BACKEND_WORKFLOW.md](BACKEND_WORKFLOW.md) | Backend architecture, request lifecycle and domain workflows |
| [FRONTEND_WORKFLOW.md](FRONTEND_WORKFLOW.md) | Frontend architecture, live vs. demo mode and per-role journeys |
| [documentation/frontend/](documentation/frontend/README.md) | Frontend design notes for roles, tenancy and marks |
| [documentation/audit/](documentation/audit/) | Code inventory, gap analysis and implementation plan |
