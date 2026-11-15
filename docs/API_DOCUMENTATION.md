# ExaNova – REST API Documentation

**Application:** ExaNova – Smart College Examination & Assessment System  
**Tagline:** Smart Examination for a Smarter Future.  
**Developer:** Durjodhan Mondal ([info@ticollege.ac.in](mailto:info@ticollege.ac.in))  
**Organization:** Techno Main Salt Lake, Kolkata, India  
**Base URL:** `/api/v1`  
**Swagger UI:** `/api/docs`  
**Authentication Scheme:** HTTP Bearer JWT

---

## 1. Global Standards & Conventions
- All endpoints are versioned with the `/api/v1` prefix.
- All requests accept `application/json` (except document multipart uploads which use `multipart/form-data`).
- Standard success responses are wrapped with metadata:
```json
{
  "statusCode": 200,
  "timestamp": "2026-11-11T12:00:00.000Z",
  "data": { ... }
}
```
- Standard error format:
```json
{
  "statusCode": 400,
  "timestamp": "2026-11-11T12:00:00.000Z",
  "path": "/api/v1/auth/login",
  "error": "Bad Request",
  "message": "Validation failed"
}
```

---

## 2. Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/login`
Authenticates Admin, Faculty, or Student (via roll number or email/username).
- **Body:**
```json
{
  "identifier": "admin",
  "password": "Admin@12345"
}
```
- **Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "328f86a4-6625-4768-8484-9c5a2cc35745",
    "username": "admin",
    "email": "admin@exanova.edu",
    "role": "ADMIN",
    "mustChangePassword": false
  }
}
```

### `POST /api/v1/auth/refresh`
Refreshes access token using rotating refresh token.
- **Body:** `{ "refreshToken": "eyJhbGciOi..." }`

### `POST /api/v1/auth/change-password`
Updates current user's password (required on first login if `mustChangePassword: true`).
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `{ "currentPassword": "OldPassword", "newPassword": "NewStrongPassword@123" }`

### `GET /api/v1/auth/me`
Fetches the currently authenticated profile with associated Faculty/Student details.

---

## 3. Academic Structure (`/api/v1/...`)

### Departments (`/api/v1/departments`)
- `POST /departments` (ADMIN) – Create department `{ "name": "Computer Science", "code": "CSE" }`
- `GET /departments` (ALL) – List all departments
- `GET /departments/:id` (ALL) – Get department by ID
- `PATCH /departments/:id` (ADMIN) – Update department
- `DELETE /departments/:id` (ADMIN) – Delete department (protected against deletion if courses or exams exist)

### Courses (`/api/v1/courses`)
- `POST /courses` (ADMIN) – Create course with automatic semester initialization
- `GET /courses` (ALL) – List courses (filter by `departmentId`)
- `GET /courses/:id` (ALL) – Get course details with semesters

### Semesters (`/api/v1/semesters`)
- `GET /semesters` (ALL) – List semesters (filter by `courseId`)

### Subjects (`/api/v1/subjects`)
- `POST /subjects` (ADMIN, FACULTY) – Create subject `{ "name": "DSA", "code": "CS301", "credits": 4, "courseId": "...", "semesterId": "..." }`
- `GET /subjects` (ALL) – List subjects

### Academic Sessions (`/api/v1/academic-sessions`)
- `POST /academic-sessions` (ADMIN) – Create session `{ "name": "2025-2026", "startDate": "...", "endDate": "..." }`
- `PATCH /academic-sessions/:id/activate` (ADMIN) – Set session as current (atomically deactivates others)

---

## 4. User Profiles (`/api/v1/...`)

### Students (`/api/v1/students` / `/api/v1/admin/students`)
- `POST /admin/students` (ADMIN) – Create single student with auto-generated user credentials
- `POST /admin/students/import` (ADMIN) – Bulk import students from in-memory Excel buffer
- `GET /admin/students/import/template` (ADMIN) – Download student Excel import template
- `GET /students` (ADMIN, FACULTY) – Search students by roll number, department, course, semester
- `GET /students/profile` (STUDENT) – View own student profile

### Faculty (`/api/v1/faculty`)
- `POST /faculty` (ADMIN) – Register faculty member
- `POST /faculty/assign-subject` (ADMIN) – Assign faculty to teach subject in session
- `GET /faculty` (ADMIN) – List faculty members

---

## 5. Examinations Management (`/api/v1/examinations`)

### Authoritative Test UUID Operations
- `POST /examinations` (ADMIN, FACULTY) – Create examination:
```json
{
  "title": "Data Structures Midterm 2026",
  "examinationCode": "DSA-MID-2026",
  "departmentId": "8ac5d6c7-3ba4-4809-ae9a-0556487ec404",
  "courseId": "01d8c2e9-33d2-4385-bddd-56ce5871ee87",
  "semesterId": "3bc11062-a1b2-44f8-b775-88d3a6fcaa48",
  "subjectId": "38c2979c-0904-4421-aeee-22671dd8a096",
  "academicSessionId": "77fda3bb-e4d1-4f78-9ba0-c764e5f04537",
  "examinationType": "MIXED",
  "startWindow": "2026-11-12T10:00:00Z",
  "endWindow": "2026-11-12T18:00:00Z",
  "durationMinutes": 60,
  "totalMarks": 50,
  "passingMarks": 20,
  "maxAttempts": 1,
  "randomizeQuestions": false,
  "randomizeOptions": false,
  "negativeMarkingType": "FIXED",
  "negativeMarkingValue": 0.25,
  "allowNegativeMarksBelowZero": false,
  "instructions": "No tab switching permitted."
}
```
- `GET /examinations` (ADMIN, FACULTY) – Filter examinations by subject, session, type, status.
- `GET /examinations/:testId` (ALL) – Get examination metadata.
- `PATCH /examinations/:testId/publish` (ADMIN, FACULTY) – Publish exam and notify enrolled eligible students.
- `PATCH /examinations/:testId/schedule` (ADMIN, FACULTY) – Schedule exam.
- `PATCH /examinations/:testId/cancel` (ADMIN, FACULTY) – Cancel exam and notify students.
- `GET /examinations/:testId/preview` (ADMIN, FACULTY) – Preview paper with questions and correct answers.
- `GET /examinations/:testId/statistics` (ADMIN, FACULTY) – Summary of attempts, averages, highest/lowest scores.
- `POST /examinations/:testId/eligible-students` (ADMIN, FACULTY) – Whitelist students by IDs or entire course/semester batch.
- `POST /examinations/:testId/assign-faculty` (ADMIN) – Assign faculty invigilator / evaluator.

---

## 6. Questions Management (`/api/v1/questions`)
- `POST /questions` (ADMIN, FACULTY) – Add question:
```json
{
  "testId": "eda8fccc-03ed-4147-91f9-768ef882a6ff",
  "questionText": "What is the time complexity of QuickSort average case?",
  "questionType": "MCQ",
  "marks": 2,
  "negativeMarks": 0.5,
  "topic": "Sorting",
  "difficulty": "MEDIUM",
  "questionOrder": 1,
  "options": [
    { "label": "A", "text": "O(n)", "isCorrect": false },
    { "label": "B", "text": "O(n log n)", "isCorrect": true },
    { "label": "C", "text": "O(n^2)", "isCorrect": false },
    { "label": "D", "text": "O(log n)", "isCorrect": false }
  ]
}
```
- `POST /questions/bulk` (ADMIN, FACULTY) – Add multiple questions in one call.
- `POST /questions/:id/duplicate` (ADMIN, FACULTY) – Clone a question.
- `POST /questions/reorder` (ADMIN, FACULTY) – Reorder question sequence.
- `DELETE /questions/:id` (ADMIN, FACULTY) – Delete question.

---

## 7. Zero-Storage In-Memory Question Imports (`/api/v1/question-imports`)
*Strictly memory buffer based; zero files written to disk or database.*

- `GET /question-imports/templates/mcq` – Download sample XLSX template for MCQ.
- `GET /question-imports/templates/descriptive` – Download sample XLSX template for Descriptive questions.
- `GET /question-imports/templates/mixed` – Download sample XLSX template for Mixed questions.
- `POST /question-imports/:testId/upload` (ADMIN, FACULTY) – Upload DOCX / XLSX file via `multipart/form-data`. Parses into memory buffer, stages items in `question_import_items`, and returns batch ID and preview.
- `GET /question-imports/:importId/preview` (ADMIN, FACULTY) – Preview staged questions with validation errors.
- `PATCH /question-imports/items/:itemId` (ADMIN, FACULTY) – Correct invalid staged question.
- `DELETE /question-imports/items/:itemId` (ADMIN, FACULTY) – Remove invalid staged item.
- `POST /question-imports/:importId/confirm` (ADMIN, FACULTY) – Atomically commits all valid staged questions into permanent `questions` and `question_options` tables, associating them with the authoritative Test UUID.

---

## 8. Examination Taking & Proctoring (`/api/v1/student/...`, `/api/v1/exam-attempts/...`)

### Student Taking Workflow
- `GET /api/v1/student/examinations` (STUDENT) – List exams where student is eligible.
- `POST /api/v1/student/examinations/:testId/start` (STUDENT) – Start examination attempt. Validates eligibility, exam window, max attempts. Freezes question sequence and option shuffling in `attempt_questions`. Returns authoritative server start time and remaining seconds.
- `GET /api/v1/exam-attempts/:attemptId` (STUDENT) – Resume active attempt. Returns questions (with options stripped of `isCorrect` and descriptive questions stripped of criteria).
- `POST /api/v1/exam-attempts/:attemptId/save-answer` (STUDENT) – Autosave answer with question ID, option ID / descriptive text. Returns authoritative server remaining seconds.
- `POST /api/v1/exam-attempts/:attemptId/activity` (STUDENT) – Anti-cheat telemetry logging (`TAB_BLUR`, `TAB_FOCUS`, `WINDOW_RESIZE`).
- `POST /api/v1/exam-attempts/:attemptId/submit` (STUDENT) – Idempotent submit. Calculates MCQ marks, marks attempt `SUBMITTED` or `EVALUATED`, and dispatches notification.

---

## 9. Evaluation & Grading (`/api/v1/evaluations`)
- `GET /evaluations/pending` (FACULTY) – List pending descriptive answers assigned to faculty.
- `GET /evaluations/:evaluationId` (FACULTY) – Get student answer with evaluation criteria and expected answer.
- `POST /evaluations/:evaluationId/grade` (FACULTY) – Award marks and provide feedback:
```json
{
  "marksAwarded": 8.5,
  "feedback": "Well explained approach and complexity. Missed negative edge cycle example."
}
```
- Validates `marksAwarded <= maximumMarks`. When all descriptive answers are graded, updates attempt status to `EVALUATED` and generates the final `Result`.

---

## 10. Results & Reports (`/api/v1/results`, `/api/v1/reports`)

### Results Management
- `GET /results` (ADMIN, FACULTY) – Filter results by exam, student, status.
- `GET /results/:id` (ADMIN, FACULTY) – Full result details.
- `POST /results/:testId/release` (ADMIN, FACULTY) – Release results to students with optional remarks. Assigns class ranks.
- `POST /results/:testId/withhold` (ADMIN) – Withhold results.
- `GET /student/results` (STUDENT) – View released results for logged-in student.
- `GET /results/:id/scorecard` (ALL) – Stream dynamic PDF scorecard generated on the fly via PDFKit using ExaNova branding.

### Reporting & Analytics
- `GET /reports/results/export/excel?testId=:testId` (ADMIN, FACULTY) – Stream Excel grade sheet.
- `GET /reports/results/export/pdf?testId=:testId` (ADMIN, FACULTY) – Stream formatted PDF summary report.

---

## 11. Dashboards & System (`/api/v1/...`)
- `GET /dashboard/admin` (ADMIN) – Total students, faculty, exams, active sessions, pass percentages.
- `GET /dashboard/faculty` (FACULTY) – Assigned exams, pending descriptive evaluations, recent activities.
- `GET /dashboard/student` (STUDENT) – Upcoming exams, completed exams, recent grades.
- `GET /notifications` (ALL) – User notification feed.
- `PATCH /notifications/:id/read` (ALL) – Mark as read.
- `GET /admin/audit-logs` (ADMIN) – Audit trail with filter by user, action, entity.
- `GET /health` (PUBLIC) – Server uptime, memory consumption, PostgreSQL connection health.
