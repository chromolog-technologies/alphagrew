# Placement

Paths are relative to `/api/v1`. Every endpoint needs `Authorization: Bearer <token>` and `Accept: application/json`. `Company` and `CampusDataset` are defined in [README.md](README.md#shared-shapes).

There are two sets of drive endpoints over the same `companies` table:

- `/companies` uses camelCase, validates strictly and returns the caller's `CampusDataset`. The current front end uses this one.
- `/staff/placement/*` uses snake_case, accepts loose input and returns its own legacy envelope.

---

## Company drives

**Permissions:** read `placement.view` (admins, placement officers, students, designations), write `placement.create` (admins, placement officers, designations), apply `placement.apply` (students).

### GET /companies

**200 OK:** the bare array `CampusDataset.companies`. Students see only drives open to their department.

### POST /companies

| Field | Type | Rules |
|---|---|---|
| `name` | string | required, max 255 |
| `role` | string | required, max 255 |
| `packageOffered` | string | required, max 100, free text such as `4.5 LPA` |
| `driveDate` | date | required |
| `status` | string | required, `upcoming`, `open`, `closing_soon`, `closed` |
| `location` | string | required, max 255 |
| `type` | string | required, `placement` or `internship` |
| `eligibleDepartments` | string[] | required, at least one existing department code |

```json
{
  "name": "Infosys", "role": "Systems Engineer", "packageOffered": "4.5 LPA",
  "driveDate": "2026-11-12", "status": "open", "location": "Bengaluru",
  "type": "placement", "eligibleDepartments": ["CSE", "ECE"]
}
```

`applicants` and `shortlisted` start at 0.

**201 Created:** `{ "data": CampusDataset }`

### PUT /companies/{company}

Same body. **200 OK:** `{ "data": CampusDataset }`

### DELETE /companies/{company}

Deletes the drive and every application to it.

**200 OK:** `{ "data": CampusDataset }`

### POST /companies/{company}/apply

**Permission:** `placement.apply`, and the email address must be verified (403 `Your email address is not verified.`). No body. Applying twice does nothing the second time.

**200 OK:** `{ "data": CampusDataset }`. The drive id appears in the student's `appliedCompanyIds`.

**Errors**

| Status | Message |
|---|---|
| 403 | `A linked student profile is required before applying.` |
| 403 | `You are not eligible for this drive.` |
| 422 | `This drive is already closed.` |

---

## Placement policy

The institution's placement rules.

`PlacementPolicy` shape:

```json
{
  "data": {
    "oneOfferRule": true,
    "dreamOfferEnabled": false,
    "dreamOfferMinCtc": null,
    "offerResponseDays": 7,
    "maxActiveApplications": null,
    "minProfileCompletion": 0,
    "debarOnRenege": true,
    "isDefault": true,
    "updatedAt": null
  }
}
```

`isDefault` is `true` until the institution saves its own policy. The values above are the defaults. The rules are stored but not yet enforced when applying.

### GET /placement-policy

**Permission:** `placement.view`. **200 OK:** `PlacementPolicy`

### PUT /placement-policy

**Permission:** `placement.manage` (admins, placement officers). The caller must belong to an institution.

| Field | Type | Rules |
|---|---|---|
| `oneOfferRule` | boolean | required |
| `dreamOfferEnabled` | boolean | required |
| `dreamOfferMinCtc` | number | 0–9999, **required when `dreamOfferEnabled` is true**, stored as null otherwise |
| `offerResponseDays` | integer | required, 1–60 |
| `maxActiveApplications` | integer | nullable, 1–100. Null means no cap. |
| `minProfileCompletion` | integer | required, 0–100 |
| `debarOnRenege` | boolean | required |

```json
{
  "oneOfferRule": true, "dreamOfferEnabled": true, "dreamOfferMinCtc": 10,
  "offerResponseDays": 5, "maxActiveApplications": 10, "minProfileCompletion": 60, "debarOnRenege": true
}
```

**200 OK:** `PlacementPolicy` with `isDefault: false`.

---

## Staff placement endpoints

These read and write real `companies` records. Responses use `{ "status": "success", "success": true, ... }`.

### GET /staff/placement/drives

**Permission:** `placement.view`.

| Query | Rules |
|---|---|
| `status` | optional, matched with `LIKE` |

**200 OK**

```json
{
  "status": "success",
  "success": true,
  "data": [{
    "id": 3, "company": "Infosys", "name": "Infosys",
    "position": "Systems Engineer", "role": "Systems Engineer",
    "salary": "4.5 LPA", "package_offered": "4.5 LPA", "package": "4.5 LPA",
    "eligibility": "CSE, ECE", "eligible_departments": ["CSE", "ECE"],
    "status": "open", "date": "2026-11-12", "drive_date": "2026-11-12",
    "registrations": 54, "applicants": 54, "shortlisted": 12,
    "location": "Bengaluru", "type": "placement", "batch_eligible": "All Batches"
  }],
  "total_drives": 1
}
```

Several keys are aliases of each other for older screens. Missing values fall back to placeholders such as `Software Engineer`, `4.5 LPA` and a date two weeks ahead.

### POST /staff/placement/drives

**Permission:** `placement.create`. Also creates a `placement_drives` row and a `job_postings` row when those tables exist.

| Field | Type | Rules |
|---|---|---|
| `company_name` or `name` | string | one of them required, max 255 |
| `position` or `role` | string | nullable, default `Software Engineer` |
| `salary` or `package_offered` | string | nullable, default `4.5 LPA` |
| `eligible_departments` | string[] | nullable. Falls back to `eligibility` when it is an array, then to `["CSE", "ECE", "IT"]`. |
| `date` or `drive_date` | date | nullable, default two weeks from today |
| `location` | string | nullable, default `Campus` |
| `type` | string | nullable, default `Placement` |
| `status` | string | nullable, default `Upcoming` |

```json
{ "company_name": "TCS", "position": "Developer", "salary": "3.6 LPA", "eligible_departments": ["CSE", "IT"], "date": "2026-12-02", "status": "open" }
```

**201 Created**

```json
{
  "status": "success", "success": true, "message": "Placement drive created successfully",
  "data": {
    "drive_id": 8, "id": 8, "company": "TCS", "name": "TCS", "position": "Developer", "role": "Developer",
    "salary": "3.6 LPA", "package_offered": "3.6 LPA", "status": "open", "location": "Campus"
  }
}
```

### PUT /staff/placement/drives/{driveId}

**Permission:** `placement.manage`. All fields optional.

| Field | Type |
|---|---|
| `status` | string |
| `salary` or `package_offered` | string |
| `position` or `role` | string |
| `location` | string |
| `registrations_closed` | boolean (accepted but ignored) |

**200 OK**

```json
{
  "status": "success", "success": true, "message": "Placement drive updated successfully",
  "data": { "drive_id": 8, "id": 8, "name": "TCS", "company": "TCS", "role": "Developer", "status": "closed", "location": "Campus" }
}
```

### GET /staff/placement/applications

**Permission:** `placement.manage`.

| Query | Rules |
|---|---|
| `drive_id` or `company_id` | optional |
| `status` | optional, `registered` or `selected` |

**200 OK**

```json
{
  "status": "success", "success": true,
  "data": [{
    "id": 77, "student_id": "CSE2026041", "name": "Rahul Menon", "email": "rahul@college.edu",
    "cgpa": 8.1, "department": "CSE", "company": "Infosys", "company_id": 3,
    "status": "registered", "offer_letter": false, "salary_offered": "4.5 LPA"
  }],
  "drive_id": 3,
  "total_applications": 1
}
```

`student_id` here is the **registration number**, not the numeric id. `status` is `selected` when the student is placed at this company, otherwise `registered`.

### GET /staff/placement/statistics

**Permission:** `placement.view`.

**200 OK**

```json
{
  "status": "success", "success": true,
  "data": {
    "total_students": 420, "placed_students": 96, "total_students_placed": 96,
    "placement_percentage": 22.86, "placement_rate": 22.86,
    "highest_package": "12 LPA", "average_package": "5.1 LPA",
    "companies_visited": 14, "total_drives": 14,
    "top_recruiter": "Infosys", "offers_pending": 324, "pending_percentage": 77.14
  }
}
```

Package figures are parsed from the first number in each drive's free-text package.

### GET /staff/placement/results-by-batch

**Permission:** `placement.view_results`.

**200 OK**

```json
{
  "status": "success", "success": true,
  "data": [{ "batch": "year_4", "total": 110, "placed": 80, "percentage": 72.73, "avg_package": "4.5 LPA", "highest": "8.5 LPA" }]
}
```

Rows are grouped by the student `year` value. `avg_package` and `highest` are fixed placeholders.

### GET /staff/placement/report

**Permission:** `placement.manage`. No file is generated yet.

**200 OK**

```json
{
  "status": "success", "success": true, "message": "Report generated successfully",
  "data": {
    "file_name": "placement_report_2026-10-28.xlsx",
    "download_url": "/api/v1/placement/report/download",
    "generated_at": "2026-10-28T09:30:00+00:00",
    "metrics": { "total_students": 420, "placed_students": 96, "total_drives": 14 }
  }
}
```

The `download_url` route does not exist.
