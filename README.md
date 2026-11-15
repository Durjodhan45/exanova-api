# ExaNova – Smart College Examination & Assessment System (Backend)

<p align="center">
  <img src="https://raw.githubusercontent.com/Durjodhan45/exanova-api/main/docs/logo.png" alt="ExaNova Logo" width="160" />
</p>

<p align="center">
  <strong>Smart Examination for a Smarter Future.</strong><br>
  A production-grade, highly secure, modular Examination & Assessment Management System backend built with NestJS, TypeORM, and PostgreSQL.
</p>

<p align="center">
  <a href="#branding-and-institution"><img src="https://img.shields.io/badge/Organization-Techno%20Main%20Salt%20Lake-101B3F.svg" alt="Techno Main Salt Lake"></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/Node.js-LTS-16A34A.svg" alt="Node.js"></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/NestJS-v12-E0234E.svg" alt="NestJS"></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/PostgreSQL-Neon%20Serverless-4530B5.svg" alt="PostgreSQL"></a>
  <a href="#technology-stack"><img src="https://img.shields.io/badge/ORM-TypeORM-D4AF37.svg" alt="TypeORM"></a>
  <a href="#testing"><img src="https://img.shields.io/badge/Tests-31%20Passed-16A34A.svg" alt="Vitest Tests"></a>
  <a href="#deployment"><img src="https://img.shields.io/badge/Deployment-Vercel-black.svg" alt="Vercel"></a>
</p>

---

## 🏛 Branding & Institutional Attribution

- **Application Name:** ExaNova
- **Tagline:** Smart Examination for a Smarter Future.
- **Developer:** Durjodhan Mondal
- **GitHub:** [https://github.com/Durjodhan45](https://github.com/Durjodhan45)
- **Email:** [info@ticollege.ac.in](mailto:info@ticollege.ac.in)
- **Organization:** Techno Main Salt Lake
- **Address:** EM-4/1, EM Block, Sector V, Bidhannagar, Kolkata, West Bengal 700091, India.

### Official Brand Color Palette
| Color Name | HEX Code | Purpose |
|---|---|---|
| **Midnight Navy** | `#101B3F` | Primary header, navigation bar, document headers |
| **Royal Purple** | `#6246EA` | Primary buttons, active states, key accents |
| **Deep Purple** | `#4530B5` | Secondary branding, hover states |
| **Gold** | `#D4AF37` | Top ranks, academic medals, prestige badges |
| **Success Green** | `#16A34A` | Passed status, correct options, active sessions |
| **Warning Amber** | `#F59E0B` | Review flags, pending evaluations |
| **Error Red** | `#DC2626` | Failed status, negative marks, validation errors |
| **Slate Gray** | `#64748B` | Subtitles, borders, metadata |
| **Soft Gray** | `#F5F6FA` | Table alternating rows, container backgrounds |
| **White** | `#FFFFFF` | Canvas base, cards |

---

## 🚀 Key Highlights & Architectural Strengths

1. **Feature-First Modular Architecture:** Built strictly with feature-oriented domains (`modules/examinations`, `modules/questions`, `modules/evaluations`, etc.), avoiding bloated global repositories.
2. **Authoritative Test UUID Principle:** Every test is identified solely by a PostgreSQL UUID v4 (`test_id`), guaranteeing relational integrity across questions, staged items, attempts, student answers, evaluations, and rank cards.
3. **Zero Persistent File Storage Policy (Strict):** No uploaded DOCX or XLSX files are ever stored on disk, S3, Cloudinary, or database blobs. File buffers are parsed in memory, staged in PostgreSQL (`question_import_items`), reviewed/corrected by faculty, and confirmed into permanent tables before buffers are garbage-collected.
4. **Dynamic On-the-Fly Document Generation:** All exported reports (ExcelJS grade sheets) and student scorecards (PDFKit) are generated directly into in-memory buffers and streamed over HTTP.
5. **High Security & RBAC:** Argon2id password hashing, rotating refresh token families, URI versioning (`/api/v1`), Helmet headers, strict whitelisting `ValidationPipe`, and Throttler rate-limiting.
6. **Robust Negative Marking Engine:** Supports 4 grading models (`NONE`, `FIXED`, `FRACTION`, `CUSTOM`) with decimal precision arithmetic avoiding floating-point inaccuracies.
7. **Authoritative Server Timer & Sequence Freeze:** Examination attempts calculate time left strictly on the server; student question and option randomization is frozen in PostgreSQL to prevent refresh cheating.
8. **Real-Time Proctor Telemetry:** Logs tab-blur, tab-focus, and window resize events during tests.

---

## 🛠 Technology Stack

- **Runtime:** Node.js LTS
- **Language:** TypeScript (ESM)
- **Framework:** NestJS v12
- **Database:** PostgreSQL 15+ / Neon Serverless PostgreSQL with Connection Pooling
- **ORM:** TypeORM v1.1.2 (`synchronize: false`)
- **Authentication:** Passport.js, Passport-JWT, Argon2id
- **Validation:** class-validator, class-transformer
- **Document Processors:** ExcelJS (Excel), Mammoth.js (Word DOCX), PDFKit (Scorecards)
- **Security:** Helmet, Throttler, CORS Allowlist
- **Testing:** Vitest (100% ESM compatible)
- **Deployment:** Vercel Serverless Functions (`@vercel/node`)

---

## 📁 Project Structure

```
exanova-api/
├── api/
│   └── index.ts                         # Vercel serverless bootstrap handler
├── docs/
│   ├── API_DOCUMENTATION.md             # Complete REST API catalog
│   ├── DATABASE_SCHEMA.md               # 31-table ER diagram & index specification
│   └── DEPLOYMENT.md                    # Vercel + Neon deployment guide
├── scripts/
│   ├── seed-admin.ts                    # Seeds superadmin user
│   ├── seed-demo.ts                     # Seeds full academic & exam demo environment
│   └── seed.ts                          # Master seed entry point
├── src/
│   ├── main.ts                          # Central app configuration, Swagger, Helmet, CORS
│   ├── app.module.ts                    # Feature-First root module registry
│   ├── common/                          # Global decorators, guards, filters, interceptors, utils
│   ├── config/                          # App, database, auth, and validation configuration
│   ├── database/
│   │   ├── data-source.ts               # TypeORM connection & migration source
│   │   ├── entities.ts                  # Central entity registry (31 entities)
│   │   └── migrations/                  # Version-controlled SQL migrations
│   ├── modules/                         # 22 Feature-First Modules
│   │   ├── academic-sessions/
│   │   ├── audit-logs/
│   │   ├── auth/
│   │   ├── courses/
│   │   ├── dashboard/
│   │   ├── departments/
│   │   ├── evaluations/
│   │   ├── exam-assignments/
│   │   ├── exam-attempts/
│   │   ├── exam-submissions/
│   │   ├── examinations/
│   │   ├── faculty/
│   │   ├── feedback/
│   │   ├── health/
│   │   ├── notifications/
│   │   ├── question-banks/
│   │   ├── question-imports/
│   │   ├── questions/
│   │   ├── reports/
│   │   ├── results/
│   │   ├── semesters/
│   │   ├── students/
│   │   ├── subjects/
│   │   └── users/
│   └── shared/                          # Enums, types, and interfaces
├── test/
│   ├── unit/                            # Unit tests (Scoring, Negative marking, Parsers, Auth, No-Storage)
│   └── app.e2e-spec.ts                  # E2E integration test
├── vercel.json                          # Vercel serverless deployment specification
└── package.json
```

---

## ⚡ Quick Start & Installation

### 1. Clone the repository
```bash
git clone https://github.com/Durjodhan45/exanova-api.git
cd exanova-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env` and fill in your PostgreSQL credentials:
```bash
cp .env.example .env
```
Key configuration items:
```ini
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://neondb_owner:npg_9SZVGRJ4TmpQ@ep-blue-bar-aozdvxlz-pooler.c-2.ap-southeast-1.aws.neon.tech/exanova-db?sslmode=require
DB_SSL=true
DB_POOL_MAX=5
JWT_SECRET=exanova-super-secret-access-token-key-2026
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=exanova-super-secret-refresh-token-key-2026
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=*
ENABLE_SWAGGER=true
```

### 4. Run database migrations
Apply the complete 31-table schema to your PostgreSQL database:
```bash
npm run migration:run
```

### 5. Seed default admin and demo data
```bash
npm run seed:demo
```

### 6. Start the server
```bash
# Development watch mode
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

### 7. Access Swagger API Documentation
Open your browser at:
`http://localhost:3000/api/docs`

---

## 🔑 Pre-Configured Demo Credentials

| Role | Username / Identifier | Password | Access Rights |
|---|---|---|---|
| **Admin** | `admin` | `Admin@12345` | Full administrative, academic, audit & system controls |
| **Faculty** | `faculty01` | `Faculty@12345` | Exam authoring, in-memory question import, descriptive grading |
| **Student** | `230001` (Roll No) | `Student@12345` | Taking eligible exams, autosave, viewing released results |

---

## 🧪 Automated Testing Suite

The repository contains 31 test suites across 6 test specifications:
```bash
npm test
```
- `test/unit/negative-marking.spec.ts`: Tests `NONE`, `FIXED`, `FRACTION`, and `CUSTOM` scoring logic and zero-floor rules.
- `test/unit/scoring.spec.ts`: Tests floating-point safe arithmetic, percentage, and letter grade thresholds.
- `test/unit/in-memory-parser.spec.ts`: Tests Excel and Word parsing from memory buffers without touching disk.
- `test/unit/no-file-storage.spec.ts`: **Mandatory test** asserting zero file directories exist, no document blobs in DB, and purely in-memory buffers.
- `test/unit/auth-security.spec.ts`: Tests Argon2id salt isolation, hash verification, and RBAC matrix.
- `src/app.controller.spec.ts`: Root health and metadata check.

---

## 📡 End-to-End Workflow Examples (cURL)

### 1. Authenticate (Login as Admin)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "admin", "password": "Admin@12345"}'
```

### 2. Authenticate as Student (Roll Number Login)
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier": "230001", "password": "Student@12345"}'
```

### 3. Create an Examination (Authoritative Test UUID)
```bash
curl -X POST http://localhost:3000/api/v1/examinations \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Data Structures Midterm 2026",
    "examinationCode": "CS301-MID-2026",
    "departmentId": "<DEPT_UUID>",
    "courseId": "<COURSE_UUID>",
    "semesterId": "<SEMESTER_UUID>",
    "subjectId": "<SUBJECT_UUID>",
    "academicSessionId": "<SESSION_UUID>",
    "examinationType": "MIXED",
    "startWindow": "2026-11-12T09:00:00Z",
    "endWindow": "2026-11-12T17:00:00Z",
    "durationMinutes": 60,
    "totalMarks": 50,
    "passingMarks": 20,
    "maxAttempts": 1,
    "negativeMarkingType": "FIXED",
    "negativeMarkingValue": 0.25,
    "instructions": "Standard college examination code of conduct applies."
  }'
```

### 4. Zero-Storage In-Memory Question Import
```bash
# 1. Download official MCQ Excel Template
curl -X GET http://localhost:3000/api/v1/question-imports/templates/mcq \
  -H "Authorization: Bearer <FACULTY_TOKEN>" \
  --output mcq_template.xlsx

# 2. Upload DOCX or XLSX for In-Memory Parsing & Staging
curl -X POST http://localhost:3000/api/v1/question-imports/<TEST_UUID>/upload \
  -H "Authorization: Bearer <FACULTY_TOKEN>" \
  -F "file=@mcq_template.xlsx"

# 3. Preview Staged Questions (shows validation warnings/errors)
curl -X GET http://localhost:3000/api/v1/question-imports/<IMPORT_UUID>/preview \
  -H "Authorization: Bearer <FACULTY_TOKEN>"

# 4. Confirm Staged Questions into PostgreSQL (discards temporary buffer)
curl -X POST http://localhost:3000/api/v1/question-imports/<IMPORT_UUID>/confirm \
  -H "Authorization: Bearer <FACULTY_TOKEN>"
```

### 5. Examination Attempt Workflow (Student)
```bash
# 1. Start Attempt (freezes question order, returns authoritative server timer)
curl -X POST http://localhost:3000/api/v1/student/examinations/<TEST_UUID>/start \
  -H "Authorization: Bearer <STUDENT_TOKEN>"

# 2. Autosave Answer (syncs answer and remaining seconds)
curl -X POST http://localhost:3000/api/v1/exam-attempts/<ATTEMPT_UUID>/save-answer \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "<QUESTION_UUID>",
    "selectedOptionId": "<OPTION_UUID>",
    "timeSpentSeconds": 45
  }'

# 3. Log Anti-Cheat Proctoring Activity
curl -X POST http://localhost:3000/api/v1/exam-attempts/<ATTEMPT_UUID>/activity \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "TAB_BLUR",
    "eventData": { "reason": "User navigated away from active browser window" }
  }'

# 4. Submit Examination Attempt (Idempotent)
curl -X POST http://localhost:3000/api/v1/exam-attempts/<ATTEMPT_UUID>/submit \
  -H "Authorization: Bearer <STUDENT_TOKEN>"
```

### 6. Descriptive Evaluation & Result Release (Faculty / Admin)
```bash
# 1. Grade Descriptive Answer
curl -X POST http://localhost:3000/api/v1/evaluations/<EVALUATION_UUID>/grade \
  -H "Authorization: Bearer <FACULTY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "marksAwarded": 8.5,
    "feedback": "Correct time complexity analysis and algorithm proof."
  }'

# 2. Release Results and Assign Ranks
curl -X POST http://localhost:3000/api/v1/results/<TEST_UUID>/release \
  -H "Authorization: Bearer <FACULTY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "remarks": "Midterm results officially published by Examination Committee." }'

# 3. Stream Dynamic In-Memory PDF Scorecard
curl -X GET http://localhost:3000/api/v1/results/<RESULT_UUID>/scorecard \
  -H "Authorization: Bearer <STUDENT_TOKEN>" \
  --output scorecard.pdf
```

---

## 🚢 Deployment on Vercel & Neon PostgreSQL

ExaNova is ready for 1-click deployment on Vercel with Neon Serverless PostgreSQL:
1. Push code to your GitHub repository.
2. Link repository in Vercel.
3. Configure `DATABASE_URL` (with `sslmode=require`), `DB_SSL=true`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.
4. Run migrations from terminal: `npm run migration:run`.
5. For full deployment step-by-step instructions, see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## 📄 License & Attribution

Developed by **Durjodhan Mondal** ([info@ticollege.ac.in](mailto:info@ticollege.ac.in)), **Techno Main Salt Lake**, Kolkata, West Bengal, India.  
*All rights reserved.*
