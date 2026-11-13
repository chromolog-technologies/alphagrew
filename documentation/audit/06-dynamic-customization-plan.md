# 06 — Dynamic Customization (Zoho-CRM-style): Gap Analysis and Plan

| Item | Value |
|---|---|
| Goal | Let each institution shape its own modules, fields, layouts, picklists, views, rules and automation without code changes, the way Zoho CRM's "Modules and Fields" works |
| Code snapshot | `main` at `0df149b` (custom modules, module records, arrangeable sidebar), 13 November 2026 |
| Evidence | Code reading of the custom-field, custom-module, dashboard, permission and sidebar code; backend and frontend test suites |
| Related | `02-gap-analysis.md` (PRD gaps), `04-implementation-plan.md`, `documentation/api/09-dashboards-and-custom-fields.md` |

Legend: ✅ Complete · 🟡 Partial · 🔴 Missing · ⚠️ Broken / misleading. Each gap has an ID (e.g. `CF-3`) used by the plan in section 6.

---

## 1. What "fully dynamic like Zoho CRM" means

Zoho CRM's customization works in layers. Each layer is configuration stored as data, which the app reads at runtime:

| Layer | What an admin can do in Zoho CRM |
|---|---|
| **Modules** | Create modules, rename standard ones, reorder and hide tabs, group them, and share them with chosen profiles |
| **Fields** | Around 20 field types: text, text area, number, decimal, currency, percent, date, date-time, email, phone, URL, checkbox, pick list, multi-select, lookup, multi-lookup, user, formula, auto-number, file, image and rollup. Each has properties: required, unique, default, help text, length and precision, and encryption |
| **Layouts** | Several layouts per module; sections with one or two columns; field order; a separate quick-create layout; layout chosen per profile |
| **Pick lists** | Global pick lists ("Global Sets") shared across fields; option order, colours and default; inactive options kept for old records |
| **Relationships** | Lookups to any module; related lists on the detail page; many-to-many links |
| **Validation** | Rules beyond required/unique: conditional checks, cross-field checks, regular expressions, custom error messages |
| **Field-level security** | Per profile, each field is read-write, read-only or hidden |
| **Views** | Saved list views with filters, chosen columns and sort; kanban; shared or private views |
| **Automation** | Workflow rules (on create/edit/field change/date) running actions: field update, email, notification, task, webhook. Plus assignment rules, approval processes and Blueprint (allowed stage transitions) |
| **Data tools** | Import with field mapping, export, mass update and delete, duplicate check, field history |
| **Integration** | Every module and field exposed through the REST API and webhooks |

The app does **not** need every Zoho feature. The aim is the subset that lets a college model its own processes (hostels, scholarships, alumni, events, committees) and extend the standard records, while the academic, financial and placement rules stay in code.

---

## 2. What exists today

| Area | Built | Where |
|---|---|---|
| Field definitions per record type | 6 types (text, number, date, yes/no, dropdown, multi-select); required, active, help text, sort order; key fixed after creation; type change blocked once values exist | `CustomFieldDefinition`, `CustomFieldController`, `SaveCustomFieldDefinitionRequest` |
| Field values | One row per field per record in typed columns (`value_text` / `value_number` / `value_date`), so dashboards can group and filter with SQL | `custom_field_values`, `CustomFieldService` |
| Record types with custom fields | Student, staff, subject, exam, company, department, course, designation, and custom modules (`module_{id}`) | `CustomFieldDefinition::ENTITIES` |
| Custom modules | Created by admins; records have title + status + custom fields; view/edit roles; active switch; ordering; soft delete | `CustomModule`, `CustomModuleRecord`, `/custom-modules` |
| Module records UI | List (search, status, paging, first 4 fields as columns) and create/edit/delete form | `CustomModuleRecordsView` |
| Field builder UI | Module catalog, field palette, standard-field display, add/edit/reorder/hide/delete fields | `CustomFieldsModule.tsx` |
| Sidebar | "Modules" group; admins reorder/hide items per group, saved institution-wide | `SidebarNavList`, `SidebarLayoutController` |
| Dashboards | Widgets can group/filter by student, subject, exam and staff custom fields | `Services/Dashboards/*` |
| Static pick lists | `master_options` (category, code, label, order), used by standard records | `MasterOption` |
| Permissions | Spatie permissions per role + designation; module permission maps per designation | `CampusPermission`, `DesignationModuleMap` |
| Audit | Definition and module changes are audited | `AuditLogger` |

---

## 3. Gap analysis

### 3.1 Modules — `MOD`

| ID | Gap | Status | Notes |
|---|---|---|---|
| MOD-1 | Built-in and custom modules live in two places: the built-in catalog is hard-coded in `CustomFieldsModule.tsx` (`DEFAULT_MODULES`), and custom modules come from the API | 🟡 | Labels, categories and "shared to" of built-in modules are display-only text. No single module registry |
| MOD-2 | Built-in modules cannot be renamed (e.g. "Students" → "Learners") or switched off on the server | 🔴 | The on/off switch for built-in modules is stored in the browser only and changes nothing |
| MOD-3 | A custom module record has only `title` + `status` as system fields; no owner, no auto-number, no configurable status values | 🟡 | Status is fixed to `active` / `archived` |
| MOD-4 | No record ownership or sharing rules: records are visible to every role the module is shared with | 🔴 | Zoho: owner, role hierarchy, sharing rules |
| MOD-5 | "Web Tabs" and "Global Sets" tabs are placeholders with disabled buttons | ⚠️ | Visible in the UI but do nothing |

### 3.2 Fields — `CF`

| ID | Gap | Status | Notes |
|---|---|---|---|
| CF-1 | Only 6 field types. Missing: long text, decimal/currency/percent (formatting + precision), date-time, email, phone, URL, lookup, user, file/image, auto-number, formula | 🔴 | The palette already offers "Multi-line text", "Decimal / Currency" and "Lookup / Relation", but they save as text / number / dropdown |
| CF-2 | Field properties missing: unique, default value, min/max, max length, decimal places, placeholder, read-only, "show in list" | 🔴 | Text is capped at 1000 characters for every text field |
| CF-3 | Values are only captured for **students**. For staff, subject, exam, company, department, course and designation, fields can be defined but no form shows them, their APIs ignore `customFields`, and required fields are not enforced on create | ⚠️ | Generic values endpoint exists (`PUT /custom-fields/values/{entity}/{id}`), but no screen uses it |
| CF-4 | Record list and detail APIs of standard modules do not return custom field values | 🔴 | Only `StudentController` returns them |
| CF-5 | Deleting a record leaves its custom field values behind (no cleanup, no foreign key on `entity_id`); `designations` is hard-deleted | ⚠️ | Orphan rows grow and could reattach if ids are reused |
| CF-6 | Value permissions are coarse and partly wrong: course, designation and staff values use `departments.*`, companies use `placement.*`, although `courses.*`, `designations.*`, `companies.*` exist | ⚠️ | `CustomFieldController::EDIT_PERMISSION` / `authorizeView` |
| CF-7 | Entity lists duplicated in three places (route `whereIn`, TS union, `ENTITIES`) | 🟡 | Drift risk; route should use the registry |
| CF-8 | No field history (who changed which value when) | 🔴 | Only definition changes are audited |
| CF-9 | No encryption / sensitive flag (e.g. Aadhaar, income) and no masking in lists or exports | 🔴 | |

### 3.3 Layouts and sections — `LAY`

| ID | Gap | Status | Notes |
|---|---|---|---|
| LAY-1 | Sections ("Add New Section") and the Create / Quick Create / Detail switch are UI state only; nothing is saved | ⚠️ | No `section` or layout table/column |
| LAY-2 | Forms are hand-written per module; the field builder does not drive the real forms (custom fields are appended at the end of the student form) | 🔴 | Needs a metadata-driven form renderer |
| LAY-3 | No per-role layouts, no column count, no conditional visibility ("show *Hostel block* only if *Hosteller* = Yes") | 🔴 | |
| LAY-4 | Standard fields of built-in modules are hard-coded lists in the frontend, not read from the server | 🟡 | Cannot be re-labelled, reordered, made required or hidden |

### 3.4 Pick lists — `PL`

| ID | Gap | Status | Notes |
|---|---|---|---|
| PL-1 | Dropdown options are copied into each field (`options` JSON); no shared ("global") pick lists | 🔴 | `master_options` exists but is a separate system for standard fields |
| PL-2 | Options are plain strings: renaming an option breaks stored values (values store the label) | ⚠️ | Needs stable option ids/codes |
| PL-3 | No option colours, default option, or inactive options kept for old records | 🔴 | |
| PL-4 | Dependent pick lists (options of B depend on A) | 🔴 | |

### 3.5 Relationships — `REL`

| ID | Gap | Status | Notes |
|---|---|---|---|
| REL-1 | No lookup field type (link a custom record to a student, staff member, course or another custom module) | 🔴 | Palette item "Lookup / Relation" is a plain dropdown |
| REL-2 | No related lists on detail pages (e.g. a student's hostel allocations) | 🔴 | There is no generic record detail page |
| REL-3 | Dashboards cannot join custom modules or lookups | 🔴 | Sources are fixed classes |

### 3.6 Validation and data quality — `VAL`

| ID | Gap | Status | Notes |
|---|---|---|---|
| VAL-1 | Only required + type checks; no unique, range, regex or cross-field rules with custom messages | 🔴 | |
| VAL-2 | No duplicate check on create/import | 🔴 | |

### 3.7 Security — `SEC`

| ID | Gap | Status | Notes |
|---|---|---|---|
| SEC-1 | No field-level security (per role/designation: edit / read-only / hidden) | 🔴 | Any user who can read a record reads all its custom fields; a student reading their own record sees every student field |
| SEC-2 | Two access models in parallel: Spatie permissions and designation module maps; custom modules add a third (view/edit roles) | 🟡 | Needs one rule: module access + field access, per role and designation |
| SEC-3 | Custom module access is by role only, not by designation (e.g. "Hostel Warden") | 🟡 | |

### 3.8 Views and lists — `VIEW`

| ID | Gap | Status | Notes |
|---|---|---|---|
| VIEW-1 | No saved list views (filters, columns, sort) per module, private or shared | 🔴 | |
| VIEW-2 | Lists cannot filter or sort by custom fields | 🔴 | Records list filters by title and status only |
| VIEW-3 | No kanban / grouping by a pick list field | 🔴 | |
| VIEW-4 | No mass update / mass delete | 🔴 | |

### 3.9 Automation — `AUTO`

| ID | Gap | Status | Notes |
|---|---|---|---|
| AUTO-1 | No workflow rules (on create / edit / field change / date reached) | 🔴 | Placement and marks have hard-coded workflows only |
| AUTO-2 | No actions engine: field update, in-app/email notification to a role or user, webhook, create task | 🔴 | Notifications exist (`CampusNotification`) and can be reused as an action |
| AUTO-3 | No approval process for custom records (e.g. scholarship request → HOD → Principal) | 🔴 | Marks has its own approval flow that could be generalised |
| AUTO-4 | No stage transitions (Blueprint-style: allowed status changes, required fields per stage) | 🔴 | |
| AUTO-5 | Institution-level webhooks for record events | 🔴 | Webhooks exist only in the Owner Console (platform level) |

### 3.10 Data tools and integration — `DATA`

| ID | Gap | Status | Notes |
|---|---|---|---|
| DATA-1 | No import (CSV/XLSX) with field mapping for any module, including custom fields | 🔴 | Also listed as a PRD gap |
| DATA-2 | No export of module records with custom fields | 🔴 | |
| DATA-3 | Custom fields are not in reports/exports of standard modules | 🔴 | |
| DATA-4 | No public API docs for custom modules; API keys are platform-level only | 🟡 | |

### 3.11 Navigation — `NAV`

| ID | Gap | Status | Notes |
|---|---|---|---|
| NAV-1 | Items cannot move between sidebar groups; groups cannot be created or renamed | 🟡 | Reorder and hide within a group are done |
| NAV-2 | Hiding a sidebar item does not block access by URL | 🟡 | By design; access is decided by permissions (SEC) |

---

## 4. Which modules are dynamic and which stay static

Rule: **a module is dynamic when an institution stores its own facts about a record; it stays static when the app computes, regulates or moves money with it.** Static modules can still show custom fields read-only where that is useful (for example a student's custom fields on the marks screen), but their schema and rules stay in code.

| Module | Decision | Customization allowed |
|---|---|---|
| Students, Staff & Faculty | Dynamic (extend) | Custom fields, layouts, sections, field security, views, import/export, workflows |
| Departments, Courses, Subjects, Batches, Designations | Dynamic (extend) | Custom fields, layouts, views, import/export |
| Exams (definition) | Dynamic (extend) | Custom fields only; mark schemes and grading stay static |
| Companies, Job Postings / Drives | Dynamic (extend) | Custom fields, layouts, views, workflows; eligibility rules stay static |
| Custom modules (hostels, scholarships, alumni, events…) | Fully dynamic | Everything in section 1 |
| Attendance, Marks, Semester results, Grade rules, Mark schemes | Static | None (high volume or regulated). Pick-list values via `master_options` only |
| Fees, Payments, Invoices, Refunds | Static | None (financial integrity, audit) |
| Placement applications, rounds, results, policy, eligibility | Static | Status labels via pick lists at most |
| Timetable, Academic years, Semesters, Announcements | Static | None |
| Owner/platform, AI, audit, security tables | Static | Not tenant customizable |

---

## 5. Target architecture

Every layer is data, read at runtime by one engine on the server and one renderer in the browser.

```
            ┌──────────────── Metadata (per institution) ────────────────┐
            │ modules ─┬─ fields ── field_options / picklists             │
            │          ├─ layouts ── sections ── section_fields           │
            │          ├─ field_permissions (role/designation × field)    │
            │          ├─ validation_rules                                │
            │          ├─ list_views                                      │
            │          └─ workflow_rules ── actions                       │
            └─────────────────────────────────────────────────────────────┘
                   │ read by                         │ read by
        ┌──────────▼─────────┐            ┌──────────▼──────────┐
        │ Record engine (PHP)│            │ Renderer (React)    │
        │ validate, authorise│  REST API  │ form / detail / list│
        │ save, audit, fire  │◄──────────►│ from metadata       │
        │ workflows          │            │                     │
        └──────────┬─────────┘            └─────────────────────┘
                   │
     standard tables (students, courses…)  +  custom_module_records
     + custom_field_values (typed EAV)     +  field history
```

Key design decisions:

1. **One module registry.** A `modules` row exists for every module, built-in or custom (`is_system`, `source`: `students` table or `custom_module_records`). Built-in rows are seeded per institution, so labels, order, active state and sharing are data. `CustomFieldDefinition::ENTITIES`, the route lists and `DEFAULT_MODULES` all read from it (closes MOD-1, MOD-2, CF-7, LAY-4).
2. **Standard fields are described too.** System fields (e.g. `students.roll_number`) get read-only definition rows (`is_system = true`, column name, type), so layouts, field security and list views treat standard and custom fields the same, while values stay in their real columns.
3. **Keep typed EAV for values.** It already supports SQL grouping in dashboards. Add `value_datetime`, a JSON column for multi-value/lookup ids, and an index per type. Move to per-module JSON columns only if a profile shows EAV is too slow (assess at ~1M values per institution).
4. **Pick lists by id.** Options get ids/codes; values store the code, so labels can be renamed. A field references either its own option set or a global set.
5. **One record engine.** Standard controllers and the custom record controller call the same service: `validate → authorise fields → save → write field history → fire workflow events`. This makes CF-3, CF-4, VAL-*, SEC-1, CF-8 and AUTO-* one implementation instead of one per module.
6. **Workflows run on the queue.** Record events go to a queued job that evaluates rules and runs actions, with a run log per rule. Nothing slows down the save.

---

## 6. Implementation plan

Effort: S ≈ 1–3 dev-days · M ≈ 4–8 · L ≈ 9–15 (one developer, including tests). Estimates; re-size after phase 0.

### Phase 0 — Fix what is broken or misleading (S–M, do first)

| # | Task | Closes | Effort | Done when |
|---|---|---|---|---|
| 0.1 | Delete custom field values when a record is deleted (model events / observer for every entity in the registry); purge on force delete | CF-5 | S | Test: deleting a course removes its values |
| 0.2 | Use the right permissions for values (`courses.*`, `designations.*`, `companies.*`, `staff.*`) | CF-6 | S | Permission tests per entity |
| 0.3 | Route entity list from `CustomFieldDefinition::ENTITIES` | CF-7 | S | One source of entity names |
| 0.4 | Hide or label palette items that are not real types yet ("Lookup", "Currency", "Multi-line") and the Web Tabs / Global Sets tabs | MOD-5, CF-1 | S | No control in the UI that silently does something else |
| 0.5 | Stop showing the built-in module on/off switch until MOD-2 exists | MOD-2 | S | |

### Phase 1 — Custom fields everywhere they are promised (M–L)

| # | Task | Closes | Effort |
|---|---|---|---|
| 1.1 | Record engine service (`RecordService`) used by the student controller first, then staff, course, department, subject, exam, company, designation: validate custom fields on create/update, enforce required, return `customFields` in list/detail | CF-3, CF-4 | L |
| 1.2 | Reuse `CustomFieldInputs` in every standard form (staff, course, department, subject, exam, company, designation) | CF-3 | M |
| 1.3 | Dashboard sources for companies, courses, departments and custom modules | REL-3 (part) | M |

### Phase 2 — Metadata foundation (L)

| # | Task | Closes | Effort |
|---|---|---|---|
| 2.1 | `modules` registry (built-in rows seeded per institution, custom modules migrated in); rename / activate / share built-in modules | MOD-1, MOD-2 | L |
| 2.2 | System field definitions for standard columns (read-only rows) | LAY-4 | M |
| 2.3 | Field properties: unique, default, min/max, max length, precision, placeholder, read-only; long text without the 1000-char cap | CF-2, VAL-1 (part) | M |
| 2.4 | New types: long text, decimal/currency/percent, date-time, email, phone, URL, auto-number | CF-1 | M |
| 2.5 | Pick lists by code + global sets (merge with `master_options`), option colours, default, inactive options | PL-1, PL-2, PL-3, MOD-5 | L |

### Phase 3 — Layouts and dynamic forms (L)

| # | Task | Closes | Effort |
|---|---|---|---|
| 3.1 | `layouts`, `layout_sections`, `section_fields` (order, column, width); persist the builder's sections and Create / Quick Create / Detail modes | LAY-1 | M |
| 3.2 | React renderer: form, quick-create and detail view generated from a layout (standard + custom fields) | LAY-2 | L |
| 3.3 | Move custom modules and then one standard module (Departments) onto the renderer; then the rest | LAY-2 | M per module |
| 3.4 | Conditional visibility rules per section/field | LAY-3 | M |

### Phase 4 — Security (M–L)

| # | Task | Closes | Effort |
|---|---|---|---|
| 4.1 | Field permissions per role and designation (edit / read / hidden), enforced in the record engine and returned to the renderer | SEC-1 | L |
| 4.2 | One access check: module access (role + designation) → record access → field access; custom modules use designations too | SEC-2, SEC-3 | M |
| 4.3 | Record owner on custom module records; "own records only" option per role | MOD-3, MOD-4 | M |
| 4.4 | Sensitive fields: encrypted at rest, masked in lists and exports, unmasked by permission | CF-9 | M |

### Phase 5 — Relationships and views (L)

| # | Task | Closes | Effort |
|---|---|---|---|
| 5.1 | Lookup and user field types (single and multi), with search pickers | REL-1 | L |
| 5.2 | Related lists on detail pages (records that look up to this one) | REL-2 | M |
| 5.3 | Saved list views: columns, filters (incl. custom fields), sort; private / shared | VIEW-1, VIEW-2 | L |
| 5.4 | Kanban by pick list; mass update / delete | VIEW-3, VIEW-4 | M |

### Phase 6 — Automation (L)

| # | Task | Closes | Effort |
|---|---|---|---|
| 6.1 | Record events (created, updated, field changed, deleted) from the record engine + field history table and UI | AUTO-1 (base), CF-8 | M |
| 6.2 | Workflow rules: trigger + conditions + actions (field update, notification, email template, webhook); queued, with run log | AUTO-1, AUTO-2, AUTO-5 | L |
| 6.3 | Date-based triggers (scheduler) | AUTO-1 | S |
| 6.4 | Approval processes (generalise the marks approval flow) | AUTO-3 | L |
| 6.5 | Stage transitions on a pick list field (allowed moves, required fields per stage) | AUTO-4 | M |

### Phase 7 — Data tools (M–L)

| # | Task | Closes | Effort |
|---|---|---|---|
| 7.1 | Import wizard (CSV/XLSX): upload → map columns to fields → validate preview → queued import → error report; duplicate check on a chosen unique field | DATA-1, VAL-2 | L |
| 7.2 | Export of any list view, custom fields included, through the existing export job pattern | DATA-2, DATA-3 | M |
| 7.3 | API docs for modules/records; institution API keys | DATA-4 | M |
| 7.4 | Sidebar: move items between groups, rename/create groups | NAV-1 | S |

### Suggested order and milestones

| Milestone | Phases | Outcome |
|---|---|---|
| M1 "Trustworthy" | 0 + 1 | Every promised custom field is captured, validated, returned and cleaned up |
| M2 "Configurable" | 2 + 3 | Admins shape modules, fields, pick lists and layouts; forms are generated |
| M3 "Governed" | 4 | Field- and record-level security, sensitive data protected |
| M4 "Connected" | 5 | Lookups, related lists, saved views |
| M5 "Automated" | 6 + 7 | Workflows, approvals, import/export |

Phases 2–3 are the foundation; doing 5–7 before them would mean building views, rules and import three times (per hand-written module).

---

## 7. Risks and decisions needed

| # | Decision / risk | Recommendation |
|---|---|---|
| D1 | Sidebar and layout configuration: institution-wide or per user? | Institution-wide (current); add per-user overrides only if asked |
| D2 | Store pick list values as codes (needs a data migration of existing select values) | Yes, before more data accumulates |
| D3 | Merge `master_options` into global pick lists | Yes, in phase 2.5, keeping `master_options` codes |
| D4 | Keep typed EAV vs JSON columns | Keep EAV; load-test at phase 5 (list views with custom-field filters are the hot path) |
| D5 | Which field types students may edit on their own profile | Decide per field via field security (phase 4) |
| R1 | Renderer migration touches every admin form | Do it module by module behind the same API; keep old forms until each passes its tests |
| R2 | Workflow loops (rule A updates a field that triggers rule B) | Depth limit and "do not re-trigger on workflow updates" flag |
| R3 | SQLite tests miss MySQL limits (as with the 64-char index name) | Run the backend suite against MySQL in CI |
