# Dashboards and custom fields

Role dashboards, dashboards that users build themselves, sharing, the widget query engine, and custom form fields. Paths are relative to `/api/v1`. Every endpoint needs a **Bearer** token and runs inside the caller's institution.

Unlike the rest of the API, these endpoints use camelCase for request and response fields.

---

## Data scope

Widgets never send SQL. A widget is a JSON **spec** that is checked against a whitelist of data sources and fields. Every query runs within the **caller's own scope**, whoever built the dashboard. A teacher who opens a dashboard shared by an admin sees only their own subjects in it.

| Scope level | Who | Sees |
|---|---|---|
| `self` | Student linked to a student record | Their own records. Marks only once locked, semester results only once published. |
| `subjects` | Staff without `marks.approve` | The subjects allocated to them (`subject_allocations.faculty_id`). Semester results only once published. |
| `department` | Staff with `marks.approve` and a `department_code` (HOD) | Their department: students by `department_code`, subjects through course → department. |
| `institution` | Institution admin, super admin, placement officer, anyone with `marks.publish` (exam coordinator) | The whole institution |
| `none` | Recruiters, and students with no linked record | Nothing. No sources are offered. |

Which **sources** a user may query also depends on permissions:

| Source | Contents | Needs |
|---|---|---|
| `students` | One row per student, with CGPA, attendance and backlogs from the academic summary | `students.view`, or scope `self` |
| `attendance` | One row per attendance session | `attendance.view` |
| `marks` | One row per mark entry | `marks.view` |
| `semester_results` | One row per student per semester | `marks.view` or `results.view_summary` |
| `exams` | One row per scheduled exam | `exams.view` or `marks.view`, or scope `self` |

`GET /dashboards/sources` returns exactly what the caller may use, with the field catalogue.

---

## Dashboards

**Permissions.** Every route needs `dashboard.view`. Creating, editing and deleting your own dashboards needs `dashboards.build`, which every institution role has. Sharing needs `dashboards.share`, which institution admins have.

### Dashboard shape

Built-in templates and saved dashboards use the same shape. Templates have `id: null` and `isTemplate: true`.

```json
{
  "id": 12,
  "key": null,
  "name": "CSE weekly review",
  "description": "Attendance and marks for CSE",
  "templateKey": "hod",
  "isTemplate": false,
  "isOwner": true,
  "isHome": false,
  "owner": { "id": 5, "name": "Dr. Meera Thomas" },
  "sharing": { "roles": ["staff"], "designationIds": [3], "audienceDefault": true },
  "widgets": [
    {
      "id": "pass-by-subject",
      "title": "Pass % by subject",
      "type": "bar",
      "spec": { "source": "marks", "measures": [{ "field": "pass_pct", "agg": "avg" }], "dimensions": [{ "field": "subject" }] },
      "layout": { "x": 0, "y": 2, "w": 6, "h": 4 },
      "options": { "format": "percent", "target": 75 }
    }
  ],
  "updatedAt": "2026-11-10T09:30:00+05:30"
}
```

| Widget field | Rules |
|---|---|
| `id` | required, string, max 40, unique within the dashboard |
| `title` | required, max 100 |
| `type` | `kpi`, `bar`, `line`, `pie`, `table` or `list` |
| `spec` | required, see [Widget spec](#widget-spec) |
| `layout` | `x` 0–11, `y` 0–500, `w` 1–12, `h` 1–12, on a 12-column grid |
| `options` | optional: `format` (`number`, `decimal`, `percent`), `target` (number), `stacked` (boolean), `color` (`#rrggbb`) |

A dashboard holds at most 30 widgets.

### Templates

Five built-in templates: `student`, `teacher`, `hod`, `examination` and `management`. The default template for a user is:

| User | Template |
|---|---|
| Student | `student` |
| Institution admin, super admin, placement officer | `management` |
| Staff with `marks.publish` | `examination` |
| Staff with `marks.approve` and a department | `hod` |
| Other staff | `teacher` |

Users may also use the templates below their level. Admins may use all five. Widgets whose source the user cannot query are left out of the template they receive.

### GET /dashboards

Your own dashboards, dashboards shared with you, and the templates you may use.

**200 OK**

```json
{
  "data": [ /* Dashboard, most recently updated first */ ],
  "templates": [ /* Dashboard with isTemplate: true */ ],
  "defaultTemplate": "teacher"
}
```

### GET /dashboards/home

The dashboard the user opens on. The first match wins:

1. your own dashboard marked `isHome`
2. a dashboard shared as the default (`audienceDefault`) with your designation
3. a dashboard shared as the default with your role
4. your role's template

**200 OK** `{ "data": Dashboard }`

### GET /dashboards/{dashboard}

**200 OK** `{ "data": Dashboard }`. **404** if the dashboard is neither yours nor shared with you.

### POST /dashboards

**Permission:** `dashboards.build`. Creates a dashboard owned by the caller.

| Field | Rules |
|---|---|
| `name` | required, max 100 |
| `description` | optional, max 255 |
| `isHome` | optional boolean. Clears `isHome` on your other dashboards. |
| `fromTemplate` | optional template key that you may use. Copies its widgets and description. |
| `fromDashboard` | optional id of a dashboard visible to you. Copies its widgets. Cannot be combined with `fromTemplate`. |
| `widgets` | optional array of widgets. Overrides the copied widgets. Every spec is validated. |

**201 Created** `{ "data": Dashboard }`. **422** names the widget at fault, for example `widgets.2.spec.measures.0.field`.

### PATCH /dashboards/{dashboard}

**Permission:** `dashboards.build`, owner only (**403** otherwise). Accepts `name`, `description`, `isHome` and `widgets`, all optional. A `widgets` array replaces the whole list.

**200 OK** `{ "data": Dashboard }`

### DELETE /dashboards/{dashboard}

**Permission:** `dashboards.build`, owner only. Soft delete.

**200 OK** `{ "message": "Dashboard deleted." }`. **403** for a dashboard shared with you, **404** for one you cannot see.

### PUT /dashboards/{dashboard}/share

**Permission:** `dashboards.share`, owner only. Replaces the sharing settings. People it is shared with get **read-only** access. They can view it, or copy it with `POST /dashboards` and `fromDashboard`.

| Field | Rules |
|---|---|
| `roles` | present, array of role values other than `super_admin`. Can be empty. |
| `designationIds` | present, array of this institution's designation ids. Can be empty. |
| `audienceDefault` | optional boolean: make it the home dashboard for those roles and designations. Ignored when both lists are empty. |

**200 OK** `{ "data": Dashboard }`. Send two empty arrays to stop sharing.

---

## Widget queries

### GET /dashboards/sources

The data sources the caller may query, their fields (custom fields included), and the caller's scope.

**200 OK**

```json
{
  "data": [{
    "key": "attendance",
    "label": "Attendance",
    "description": "One row per attendance session.",
    "fields": [
      { "key": "records", "label": "Number of records", "type": "number", "dimension": false, "aggregations": ["count"], "options": [], "group": null, "custom": false },
      { "key": "present_pct", "label": "Present %", "type": "number", "dimension": false, "aggregations": ["avg"], "options": [], "group": null, "custom": false },
      { "key": "subject", "label": "Subject", "type": "string", "dimension": true, "aggregations": [], "options": [], "group": null, "custom": false },
      { "key": "cf.student.hostel", "label": "Hostel (Student)", "type": "string", "dimension": true, "aggregations": ["count_distinct"], "options": ["Yes", "No"], "group": "Custom fields", "custom": true }
    ]
  }],
  "scope": { "level": "subjects", "label": "Your allocated subjects" }
}
```

Fields with `dimension: true` can be used as groupings and filters. Fields with aggregations can be measures. Custom fields have keys of the form `cf.<entity>.<key>`.

### POST /dashboards/query

Runs one spec (`spec`), or up to 30 at once (`specs`, an object keyed by widget id) so a whole dashboard loads in one request. Use it for live previews in the builder.

**Single spec: 200 OK**

```json
{
  "data": {
    "columns": [
      { "key": "d0", "role": "dimension", "field": "subject", "label": "Subject", "type": "string", "agg": null },
      { "key": "m0", "role": "measure", "field": "present_pct", "label": "Present %", "type": "number", "agg": "avg" }
    ],
    "rows": [{ "d0": "Data Structures", "m0": 91.4 }],
    "truncated": false,
    "scope": { "level": "subjects", "label": "Your allocated subjects" }
  }
}
```

An invalid spec gives **422**. A source the caller may not query gives **403**.

**Batch: 200 OK.** Each widget succeeds or fails on its own:

```json
{
  "data": {
    "w1": { "ok": true, "columns": [], "rows": [], "truncated": false, "scope": {} },
    "w2": { "ok": false, "status": 403, "message": "You cannot query Attendance." }
  }
}
```

### Widget spec

```json
{
  "source": "attendance",
  "measures": [{ "field": "present_pct", "agg": "avg" }],
  "dimensions": [{ "field": "subject" }, { "field": "date", "grain": "month" }],
  "filters": [{ "field": "status", "op": "in", "value": ["present", "absent"] }],
  "having": [{ "measure": 0, "op": "<", "value": 75 }],
  "sort": { "by": "m0", "dir": "asc" },
  "limit": 50
}
```

| Key | Rules |
|---|---|
| `source` | required, a source key from `GET /dashboards/sources` |
| `measures` | 1–6 items of `{ field, agg }`. `agg` must be one the field lists: `count`, `count_distinct`, `sum`, `avg`, `min`, `max`. |
| `dimensions` | 0–2 groupings of `{ field, grain? }`. `grain` (`day`, `month`, `year`) is allowed on date fields only. |
| `filters` | `{ field, op, value }`. The operators depend on the field type (table below). |
| `having` | Conditions on a measure's result: `{ measure: <index>, op, value }` with `=`, `!=`, `>`, `>=`, `<` or `<=` |
| `sort` | `{ by: "d0" \| "d1" \| "m0" … , dir: "asc" \| "desc" }`. Defaults to the first grouping, ascending. |
| `limit` | 1–500, default 100. `truncated: true` means more rows exist. |

| Field type | Filter operators |
|---|---|
| string | `=` `!=` `in` `not_in` `contains` `is_null` `not_null` |
| number | `=` `!=` `>` `>=` `<` `<=` `between` `in` `is_null` `not_null` |
| date | `=` `>` `>=` `<` `<=` `between` `last_days` `next_days` `is_null` `not_null` |
| boolean | `=` `is_null` `not_null` |

`between` takes `[from, to]`, and `in` / `not_in` take an array. `last_days` and `next_days` take a whole number of days.

---

## Custom fields

Extra fields that admins add to records. They appear on forms and as fields in the widget builder.

| Entity | Record | Values edited with |
|---|---|---|
| `student` | Student | `students.create`, plus the usual student access rules |
| `staff` | Institution staff user | `departments.create` |
| `subject` | Subject | `departments.create` |
| `exam` | Exam | `exams.edit` |

| Type | Value | Stored in |
|---|---|---|
| `text` | string, max 1000 | text |
| `number` | number | number |
| `date` | `YYYY-MM-DD` | date |
| `boolean` | `true` / `false` | number |
| `select` | one of `options` | text |
| `multiselect` | array of `options` | text (JSON) |

### Definition shape

```json
{
  "id": 3, "entity": "student", "key": "hostel", "label": "Hostel", "type": "select",
  "options": ["Yes", "No"], "helpText": "Does the student stay in the hostel?",
  "isRequired": false, "isActive": true, "sortOrder": 0
}
```

### GET /custom-fields

Any signed-in user, because forms need the definitions.

| Query | Rules |
|---|---|
| `entity` | optional: `student`, `staff`, `subject` or `exam` |
| `includeInactive` | optional boolean. Honoured for users with `custom_fields.manage` only. |

**200 OK** `{ "data": [Definition] }`, ordered by entity, sort order and id.

### POST /custom-fields

**Permission:** `custom_fields.manage`.

| Field | Rules |
|---|---|
| `entity` | required, one of the four entities |
| `key` | required, max 50, `^[a-z][a-z0-9_]*$`, unique per entity in the institution. The admin screen derives it from the label. |
| `label` | required, max 100 |
| `type` | required, one of the six types |
| `options` | required for `select` and `multiselect`: up to 100 distinct strings, each max 100 |
| `helpText` | optional, max 255 |
| `isRequired` | optional boolean. Required fields must be filled when a record is created. |
| `isActive` | optional boolean, default true |
| `sortOrder` | optional, 0–65000 |

**201 Created** `{ "data": Definition }`

### PATCH /custom-fields/{customField}

**Permission:** `custom_fields.manage`. Accepts the fields above except `entity` and `key`.

**200 OK** `{ "data": Definition }`. **409** when the field already has values and the new type is stored in a different column (for example `text` → `number`). Create a new field instead.

### DELETE /custom-fields/{customField}

**Permission:** `custom_fields.manage`. Soft delete. The field disappears from forms and dashboards, and its key stays reserved.

**200 OK** `{ "message": "Custom field deleted." }`

### GET /custom-fields/values/{entity}/{id}

One record's values, with every active field present (`null` when empty).

**Access.**
- `student`: `students.view`, or the student themself.
- `staff`: `departments.view`, or the user themself.
- `subject`: `departments.view` or `marks.view`.
- `exam`: `exams.view` or `marks.view`.

**200 OK** `{ "data": { "hostel": "Yes", "scholarship_amount": 25000, "interests": ["Robotics"] } }`. **404** for a record outside the institution.

### PUT /custom-fields/values/{entity}/{id}

Sets values on one record. The edit permission is in the entity table above.

```json
{ "customFields": { "hostel": "No", "scholarship_amount": null } }
```

Keys that are left out keep their value. `null`, `""` or `[]` clears a value. Unknown keys give **422**.

**200 OK** with the same body as the GET.

### Custom fields on student create and update

`POST /students` and `PUT /students/{student}` also accept a `customFields` object, validated against the active student fields. They save it in the same transaction as the student. Student responses include `customFields`.

Staff, subject and exam forms don't send custom fields yet. Use `PUT /custom-fields/values/...` for those records.
