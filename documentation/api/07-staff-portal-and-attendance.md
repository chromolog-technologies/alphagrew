# Staff portal and attendance

Paths are relative to `/api/v1`. Every endpoint needs `Authorization: Bearer <token>` and `Accept: application/json`.

This file has two parts:

1. **Attendance** (`/attendance/*`). Real database records.
2. **Staff portal** (`/staff/*` except `/staff/placement/*`). **Hardcoded sample data.** These endpoints validate input but save nothing, and they send `X-Data-Source: sample`. Their shapes are provisional. `/staff/placement/*` is real and lives in [05-placement.md](05-placement.md).

---

## 1. Attendance

Responses use snake_case and no `data` envelope. Records are tenant-scoped.

`Attendance` record (raw model):

```json
{
  "id": 901, "student_id": 41, "subject_id": 12, "faculty_id": 7,
  "attendance_date": "2026-10-27", "status": "present", "remarks": null, "is_approved": false,
  "student": { "...": "student model" }, "subject": { "...": "subject model" }, "faculty": { "...": "user model" },
  "created_at": "...", "updated_at": "..."
}
```

`status` is `present`, `absent`, `leave` or `other`.

### GET /attendance

**Permission:** `attendance.view`. A student sees only their own records.

| Query | Rules |
|---|---|
| `subject_id` | optional |
| `student_id` | optional |
| `from_date`, `to_date` | optional, dates |
| `status` | optional |
| `per_page` | optional, default 50 |
| `page` | optional |

**200 OK**

```json
{
  "attendance": [Attendance],
  "pagination": { "total": 320, "per_page": 50, "current_page": 1, "last_page": 7 }
}
```

### GET /attendance/subjects

**Permission:** `attendance.mark`. Active subjects the user can mark attendance for.

**200 OK:** `{ "subjects": [{ "id": 12, "name": "Database Systems", "code": "CS305" }] }`

### GET /attendance/subject/{subjectId}/students

**Permission:** `attendance.mark`. The roster: students in classes of the subject's course for the same semester number.

**200 OK**

```json
{
  "subject": { "id": 12, "name": "Database Systems", "code": "CS305" },
  "students": [{ "id": 41, "roll_number": "CSE2026041", "name": "Rahul Menon", "email": "rahul@college.edu" }]
}
```

### POST /attendance/mark

**Permission:** `attendance.mark`. Creates records, or updates the record that already exists for the same student, subject and date.

| Field | Type | Rules |
|---|---|---|
| `subject_id` | integer | required, existing subject |
| `attendance_date` | date | required |
| `attendance_data` | object[] | required |
| `attendance_data.*.student_id` | integer | required, existing student |
| `attendance_data.*.status` | string | required, `present`, `absent`, `leave`, `other` |
| `remarks` | string | nullable, applied to every row |

```json
{
  "subject_id": 12,
  "attendance_date": "2026-10-27",
  "attendance_data": [
    { "student_id": 41, "status": "present" },
    { "student_id": 42, "status": "leave" }
  ],
  "remarks": "Lab session"
}
```

**200 OK**

```json
{ "message": "Attendance marked successfully", "created": 2, "errors": [], "attendance": [Attendance] }
```

Rows that fail are listed in `errors` as `{ "student_id", "error" }` and the others are still saved.

### PUT /attendance/{attendanceId}

**Permission:** `attendance.edit` (admins).

| Field | Type | Rules |
|---|---|---|
| `status` | string | required, `present`, `absent`, `leave`, `other` |
| `remarks` | string | nullable |

**200 OK:** `{ "message": "Attendance updated successfully", "attendance": Attendance }`

### DELETE /attendance/{attendanceId}

**Permission:** `attendance.delete` (admins).

**200 OK:** `{ "message": "Attendance deleted successfully" }`

### POST /attendance/approve

**Permission:** `attendance.approve` (admins).

| Field | Type | Rules |
|---|---|---|
| `attendance_ids` | integer[] | required, at least one existing record id |

**200 OK:** `{ "message": "Attendance approved successfully", "count": 3 }`

### GET /attendance/student/{studentId}/report

**Permission:** `attendance.view`.

| Query | Rules |
|---|---|
| `semester_id` | optional. Treated as a **semester number**: filters subjects with that `semester_number`. |

**200 OK**

```json
{
  "student": { "id": 41, "name": "Rahul Menon", "roll_number": "CSE2026041", "email": "rahul@college.edu" },
  "overall": { "total_classes": 160, "present": 140, "absent": 16, "leave": 4, "percentage": 87.5, "status": "Satisfactory" },
  "by_subject": [{ "subject": { "...": "subject model" }, "total_classes": 40, "present": 34, "absent": 5, "leave": 1, "percentage": 85, "status": "Satisfactory" }],
  "records": [Attendance]
}
```

`status` is `Satisfactory` at 75% or more, otherwise `Low`.

### GET /attendance/subject/{subjectId}/report

**Permission:** `attendance.view`.

| Query | Rules |
|---|---|
| `from_date`, `to_date` | optional, dates |

**200 OK**

```json
{
  "subject": { "id": 12, "name": "Database Systems", "code": "CS305" },
  "summary": [{ "student": "Rahul Menon", "total_classes": 40, "present": 34, "absent": 5, "leave": 1, "percentage": 85 }],
  "records": [Attendance]
}
```

---

## 2. Staff portal (sample data)

All responses use `{ "success": true, "data": ..., ...extra }`. Values are fixed examples. Writes return a success message and change nothing.

### Attendance (staff)

| Endpoint | Permission | Input | Response |
|---|---|---|---|
| `GET /staff/attendance/classes` | `attendance.mark` | none | `data: [{ id, name, semester, student_count }]` |
| `GET /staff/attendance/subjects` | `attendance.mark` | query `class_id` | `data: [{ id, code, name, credits }]`, `class_id` |
| `GET /staff/attendance/students` | `attendance.mark` | query `class_id`, `subject_id`, `date` (default today) | `data: [{ id, name, rollNo, status: null }]`, `class_id`, `subject_id`, `date` |
| `POST /staff/attendance/submit` | `attendance.mark` | body below | `message`, `data: { class_id, submitted_count, date }` |
| `GET /staff/attendance/history` | `attendance.view` | query `class_id`, `subject_id`, `start_date`, `end_date` (ignored) | `data: [{ date, total_students, present, absent, late, percentage }]` |

`POST /staff/attendance/submit` body:

| Field | Type | Rules |
|---|---|---|
| `class_id` | integer | required |
| `subject_id` | integer | required |
| `date` | date | required |
| `attendance` | object[] | required |
| `attendance.*.student_id` | integer | required |
| `attendance.*.status` | string | required, `present`, `absent`, `late` |

Use `POST /attendance/mark` to actually save attendance.

### Marks (staff)

| Endpoint | Permission | Input | Response |
|---|---|---|---|
| `GET /staff/marks/exams` | `marks.view` | none | `data: [{ id, name, type, max_marks }]` |
| `GET /staff/marks/students` | `marks.create` | query `class_id`, `exam_id`, `subject_id`, `total_marks` (default 50) | `data: [{ id, name, rollNo, marksObtained, totalMarks }]` plus the query values |
| `POST /staff/marks/submit` | `marks.create` | body below | `message`, `data: { exam_id, subject_id, class_id, submitted_count, total_marks }` |
| `GET /staff/marks/statistics` | `marks.view` | query `class_id`, `exam_id`, `subject_id` | `data: { total_students, marks_entered, marks_pending, average_marks, highest_marks, lowest_marks, pass_count, fail_count, pass_percentage }` |
| `GET /staff/marks/template` | `marks.create` | query `exam_id`, `subject_id`, `class_id` | `data: { file_name, download_url, class_id }`. The URL does not exist. |
| `POST /staff/marks/upload` | `marks.create` | multipart: `file` (xlsx, xls or csv), `exam_id`, `subject_id`, `class_id` (all required) | `data: { records_processed, records_imported, errors, exam_id }` |

`POST /staff/marks/submit` body: `exam_id`, `subject_id`, `class_id` (required integers), `total_marks` (required, ≥ 1), `marks` (required array of `{ student_id, marks_obtained }`).

Use the `/mark-entries` endpoints in [04-academics-and-results.md](04-academics-and-results.md) for real marks.

### Exam coordination

| Endpoint | Permission | Input | Response |
|---|---|---|---|
| `GET /staff/exam` | `exams.view` | query `semester`, `status` (`scheduled`, `ongoing`, `completed`) | `data: [{ id, name, type, semester, status, start_date, end_date, subjects_count, students_count }]`, `total_exams` |
| `POST /staff/exam` | `exams.create` | `name` (required), `type` (`mid` or `end`), `semester` (integer), `start_date`, `end_date`, `subjects` (array), all required | `message`, `data: { exam_id, name, status: "scheduled" }` |
| `GET /staff/exam/{examId}` | `exams.view` | none | `data: { id, name, type, semester, status, start_date, end_date, subjects: [{ id, code, name, max_marks }], invigilators_assigned, classrooms_assigned, marks_submitted, marks_pending, result_declared }` |
| `GET /staff/exam/{examId}/progress` | `exams.view` | none | `data: { total_students, appeared, absent, appearance_percentage, marks_submitted, marks_pending, submission_percentage, result_status }`, `exam_id` |
| `POST /staff/exam/{examId}/assign-invigilators` | `exams.edit` | `invigilators` (integer[]), `date`, `time_slot`, all required | `data: { exam_id, assigned_count }` |
| `POST /staff/exam/{examId}/assign-classrooms` | `exams.edit` | `classrooms` (array of `{ room_number, capacity, date, time }`, all required) | `data: { exam_id, classrooms_assigned }` |
| `POST /staff/exam/{examId}/declare-results` | `exams.edit` | `publish_date` (date), `publish_time` (string), both required | `message`, `data: { exam_id, publish_date, status }` |
| `GET /staff/exam/seating-arrangement` | `exams.view` | query `exam_id`, `date` | `data: [{ room_number, capacity, assigned_students, invigilators, time_slot, subject }]` |
| `GET /staff/exam/report` | `exams.view` | query `exam_id` | `data: { file_name, download_url }`. No file is generated. |

The `exams.*` permissions belong only to admins by default.

### Department

| Endpoint | Permission | Input | Response `data` |
|---|---|---|---|
| `GET /staff/department/overview` | `departments.view` | query `department_id` (default 1) | `{ id, name, head, email, phone, establishment_year, accreditation, vision, mission, total_staff, total_students, programs: [{ name, duration, intake }] }` |
| `GET /staff/department/staff` | `staff.view` | query `department_id` | `[{ id, name, designation, specialization, experience, email, office_hours, status }]`, plus `total_staff` |
| `GET /staff/department/classes` | `classes.view` | query `department_id` | `[{ id, name, semester, strength, class_teacher, subjects, avg_attendance }]`, plus `total_classes` |
| `GET /staff/department/performance` | `reports.view` | none | `{ total_students, active_students, avg_gpa, placement_rate, avg_package, highest_package, research_papers, research_projects, faculty_certifications, student_achievements }` |
| `GET /staff/department/budget` | `reports.view` | query `year` | `{ total_allocated, spending_categories: [{ category, allocated, spent }], total_spent, utilization_percentage, fiscal_year }` |
| `GET /staff/department/announcements` | `announcements.view` | query `department_id` | `[{ id, title, content, issued_by, issued_date, priority }]` |
| `GET /staff/department/infrastructure` | `reports.view` | none | `{ classrooms, labs: [{ name, systems, dedicated_staff }], library, sports_facilities, canteen, hostel }` |

### Staff management

Use `/staff` (V1) in [03-people.md](03-people.md) for real staff accounts.

| Endpoint | Permission | Input | Response |
|---|---|---|---|
| `GET /staff/management` | `staff.view` | query `department_id`, `designation_id` (ignored) | `data: [{ id, name, email, phone, designation, department, specialization, joinDate, experience, status }]`, `total_staff`, `active_count` |
| `POST /staff/management` | `staff.create` | `name`, `email` (unique), `phone`, `designation_id`, `department_id`, `join_date` required; `specialization` optional | `data: { staff_id, name, email }` |
| `GET /staff/management/{staffId}` | `staff.view` | none | `data: { ...list fields, qualifications, classes_assigned, subjects, office_hours }` |
| `PUT /staff/management/{staffId}` | `staff.edit` | optional `name`, `email`, `phone`, `designation_id`, `specialization`, `office_hours`, `status` (`active` or `inactive`) | `data: { staff_id, updated_fields }` |
| `DELETE /staff/management/{staffId}` | `staff.delete` | none | `data: { staff_id }` |
| `POST /staff/management/{staffId}/assign-classes` | `staff.edit` | `classes` (integer[], required) | `data: { staff_id, classes_assigned, class_ids }` |
| `GET /staff/management/{staffId}/workload` | `staff.view` | query `staff_id` | `data: { classes_assigned, subjects_taught, students_total, office_hours_per_week, research_projects, papers_published }` |
| `GET /staff/management/list/departments` | `staff.view` | none | `data: [{ id, name, head, staff_count }]` |
| `GET /staff/management/list/designations` | `staff.view` | none | `data: [{ id, name, level }]` |

### Reports

| Endpoint | Permission | Input | Response `data` |
|---|---|---|---|
| `GET /staff/reports/academic-performance` | `reports.view` | query `semester` (default 5) | `{ semester, total_students, class_wise_performance: [...], subject_wise_performance: [...], semester_statistics: { highest_gpa, lowest_gpa, median_gpa } }` |
| `GET /staff/reports/attendance` | `reports.view` | query `semester`, `start_date`, `end_date` | `{ class_wise_attendance, subject_wise_attendance, critical_alerts, ... }` |
| `GET /staff/reports/placement` | `reports.view` | none | `{ batch_wise, company_wise, domain_wise, ... }` |
| `GET /staff/reports/research` | `reports.view` | none | `{ active_research_projects, published_papers, patents_filed, collaborations, faculty_contributions, student_achievements }` |
| `GET /staff/reports/resource-utilization` | `reports.view` | none | `{ labs, library, classroom_utilization }` |
| `POST /staff/reports/generate` | `reports.generate` | `report_type` (`academic`, `attendance`, `placement`, `research`, `resource`) and `format` (`pdf` or `excel`) required; `semester`, `start_date`, `end_date` optional | `{ file_name, download_url, generated_at }`. No file is generated. |
