---
title: Frontend Documentation
description: Document a React screen by role, component, data source, and the Laravel route it actually calls.
---

# Frontend Documentation

Use this procedure when a screen is added or wired to an API. This workflow records where the screen gets its data. It does not change the screen. There is no frontend architecture doc yet; the gap register is `documentation/gaps/frontend-gaps.md`.

## Step 1 — Name the screen
- State the role, the component file, and whether `frontend/src/components/layouts/CampusWorkspace.tsx` mounts it in `renderTabContent`.
- A component that is only exported from an `index.ts`, or only rendered by an unmounted dashboard, is unmounted. Document it as unmounted.
- `RoleBasedSidebar.tsx` is not the live navigation. Campus workspace tabs are.

## Step 2 — Trace the data source
Follow imports and `fetch` calls until the request leaves the component. Record one primary source:

| Source | Where to look |
|---|---|
| Laravel via `apiClient` | `frontend/src/api/apiClient.ts`. Paths are relative to `VITE_API_BASE_URL`. |
| Laravel via `campusApi` | `frontend/src/api/campusApi.ts`. |
| Laravel via direct `fetch` | A component that builds `${VITE_API_BASE_URL}/...` itself. |
| Campus dataset | Props and handlers in `CampusWorkspace`, backed by `App.tsx` (`loginWithCampusApi`, `fetchCampusBootstrap`, and `localStorage` keys `chromolog-campus-auth` / campus data). |
| Component-local state | `useState` seeded with hardcoded rows. Nothing is sent to an API. |
| Legacy Express server | Root-relative `fetch('/api/...')` with no `VITE_API_BASE_URL`. Those routes live in `frontend/server.ts` and `frontend/src/db.ts` (SQLite), not in Laravel. |

Known Express-only paths: `/api/jobs`, `/api/admin/*`, `/api/analytics/overview`, `/api/applications`, `/api/test-attempts`, `/api/companies/:userId`, `/api/ai/extract-jd`, `/api/students/:id` on that server.

## Step 3 — Map the call to Laravel
- Match the path to a route in `backend/routes/api.php`.
- If the path exists only on `frontend/server.ts`, mark it orphan. Laravel does not serve it.
- If the Laravel route sits inside the `sample-data` group (`/api/v1/staff/*`, `/api/v1/student/materials`, `/api/v1/student/assignments`, `/api/v1/student/notifications`), the screen is a prototype. `PrototypeNotice` should stay visible. Do not document the screen as persisted.
- `/api/v1/student/attendance`, `/api/v1/student/marks`, and `/api/v1/student/timetable` are outside `sample-data`. `/api/v1/attendance/*` is the real attendance controller. `/api/v1/staff/attendance` and `/api/v1/staff/marks` are the sample copies.

## Step 4 — Record the row
Add or update a row in `documentation/gaps/frontend-gaps.md` with:

- Screen and component path.
- Mounted or unmounted, and the workspace tab id when mounted.
- Data source from Step 2.
- Laravel route, Express path, or "none".
- Persisted or not.

## Step 5 — Report
State the screen, the source, and whether a save survives a reload. A successful-looking form that only updates `useState` is not persisted.
