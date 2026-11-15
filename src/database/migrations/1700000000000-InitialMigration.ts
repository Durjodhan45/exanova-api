import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1700000000000 implements MigrationInterface {
  name = 'InitialMigration1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp or pgcrypto extension if available
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create ENUM types safely
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'FACULTY', 'STUDENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."examinations_examination_type_enum" AS ENUM('MCQ', 'DESCRIPTIVE', 'MIXED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."examinations_status_enum" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'LIVE', 'COMPLETED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."examinations_negative_marking_type_enum" AS ENUM('NONE', 'FIXED', 'FRACTION', 'CUSTOM');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."questions_question_type_enum" AS ENUM('MCQ', 'DESCRIPTIVE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."questions_difficulty_enum" AS ENUM('EASY', 'MEDIUM', 'HARD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."question_imports_status_enum" AS ENUM('PENDING', 'VALIDATED', 'CONFIRMED', 'REJECTED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."exam_attempts_status_enum" AS ENUM('IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'EXPIRED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."attempt_questions_status_enum" AS ENUM('NOT_VISITED', 'UNANSWERED', 'ANSWERED', 'MARKED_FOR_REVIEW', 'ANSWERED_AND_MARKED_FOR_REVIEW');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."descriptive_evaluations_status_enum" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."results_pass_fail_status_enum" AS ENUM('PASS', 'FAIL');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."results_status_enum" AS ENUM('CALCULATED', 'PUBLISHED', 'WITHHELD');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."notifications_type_enum" AS ENUM('EXAM_PUBLISHED', 'EXAM_SCHEDULED', 'EXAM_CANCELLED', 'EXAM_REMINDER', 'SUBMISSION_CONFIRMATION', 'EVALUATION_COMPLETED', 'RESULT_RELEASED', 'PASSWORD_RESET', 'SYSTEM_ALERT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."audit_logs_action_enum" AS ENUM(
          'AUTH_LOGIN', 'AUTH_LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETE',
          'USER_CREATE', 'USER_UPDATE', 'USER_STATUS_CHANGE', 'ACADEMIC_ENTITY_CREATE', 'ACADEMIC_ENTITY_UPDATE',
          'ACADEMIC_ENTITY_DELETE', 'EXAM_CREATE', 'EXAM_UPDATE', 'EXAM_PUBLISH', 'EXAM_SCHEDULE', 'EXAM_CANCEL',
          'QUESTION_CREATE', 'QUESTION_UPDATE', 'QUESTION_DELETE', 'QUESTION_IMPORT_UPLOAD', 'QUESTION_IMPORT_CONFIRM',
          'QUESTION_IMPORT_CANCEL', 'EXAM_ATTEMPT_START', 'EXAM_ANSWER_SAVE', 'EXAM_SUBMIT', 'DESCRIPTIVE_EVALUATION',
          'RESULT_CALCULATE', 'RESULT_RELEASE', 'RESULT_WITHHOLD', 'REPORT_EXPORT'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // 1. Users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" varchar NOT NULL UNIQUE,
        "email" varchar NOT NULL UNIQUE,
        "password_hash" varchar NOT NULL,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'STUDENT',
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "must_change_password" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // 2. Refresh tokens
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar NOT NULL,
        "is_revoked" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "user_agent" text,
        "ip_address" varchar(64),
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
    `);

    // 3. Password reset tokens
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token_hash" varchar NOT NULL,
        "is_used" boolean NOT NULL DEFAULT false,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id");
    `);

    // 4. Departments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "departments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar NOT NULL UNIQUE,
        "code" varchar(32) NOT NULL UNIQUE,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // 5. Courses
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "courses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE RESTRICT,
        "name" varchar NOT NULL,
        "code" varchar(32) NOT NULL UNIQUE,
        "duration_years" integer NOT NULL DEFAULT 4,
        "total_semesters" integer NOT NULL DEFAULT 8,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_courses_department_id" ON "courses" ("department_id");
    `);

    // 6. Semesters
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "semesters" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE RESTRICT,
        "semester_number" integer NOT NULL,
        "name" varchar(64) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_semesters_course_number" UNIQUE ("course_id", "semester_number")
      );
      CREATE INDEX IF NOT EXISTS "idx_semesters_course_id" ON "semesters" ("course_id");
    `);

    // 7. Subjects
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE RESTRICT,
        "semester_id" uuid NOT NULL REFERENCES "semesters"("id") ON DELETE RESTRICT,
        "name" varchar NOT NULL,
        "code" varchar(32) NOT NULL UNIQUE,
        "credits" integer NOT NULL DEFAULT 3,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_subjects_course_id" ON "subjects" ("course_id");
      CREATE INDEX IF NOT EXISTS "idx_subjects_semester_id" ON "subjects" ("semester_id");
    `);

    // 8. Academic sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "academic_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(64) NOT NULL UNIQUE,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "is_current" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // 9. Faculty
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "faculty" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "employee_id" varchar(64) NOT NULL UNIQUE,
        "first_name" varchar(128) NOT NULL,
        "last_name" varchar(128) NOT NULL,
        "designation" varchar(128) NOT NULL DEFAULT 'Assistant Professor',
        "phone" varchar(20),
        "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_faculty_department_id" ON "faculty" ("department_id");
    `);

    // 10. Students
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "students" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "roll_number" varchar(64) NOT NULL UNIQUE,
        "registration_number" varchar(64) UNIQUE,
        "first_name" varchar(128) NOT NULL,
        "last_name" varchar(128) NOT NULL,
        "phone" varchar(20),
        "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE RESTRICT,
        "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE RESTRICT,
        "current_semester_id" uuid NOT NULL REFERENCES "semesters"("id") ON DELETE RESTRICT,
        "academic_session_id" uuid NOT NULL REFERENCES "academic_sessions"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_students_department_id" ON "students" ("department_id");
      CREATE INDEX IF NOT EXISTS "idx_students_course_id" ON "students" ("course_id");
      CREATE INDEX IF NOT EXISTS "idx_students_current_semester_id" ON "students" ("current_semester_id");
      CREATE INDEX IF NOT EXISTS "idx_students_academic_session_id" ON "students" ("academic_session_id");
    `);

    // 11. Faculty subject assignments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "faculty_subject_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "faculty_id" uuid NOT NULL REFERENCES "faculty"("id") ON DELETE CASCADE,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE RESTRICT,
        "academic_session_id" uuid NOT NULL REFERENCES "academic_sessions"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_faculty_subject_session" UNIQUE ("faculty_id", "subject_id", "academic_session_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_fsa_faculty_id" ON "faculty_subject_assignments" ("faculty_id");
      CREATE INDEX IF NOT EXISTS "idx_fsa_subject_id" ON "faculty_subject_assignments" ("subject_id");
      CREATE INDEX IF NOT EXISTS "idx_fsa_session_id" ON "faculty_subject_assignments" ("academic_session_id");
    `);

    // 12. Examinations (authoritative Test ID = id)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "examinations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(256) NOT NULL,
        "examination_code" varchar(64) NOT NULL UNIQUE,
        "description" text,
        "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE RESTRICT,
        "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE RESTRICT,
        "semester_id" uuid NOT NULL REFERENCES "semesters"("id") ON DELETE RESTRICT,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE RESTRICT,
        "academic_session_id" uuid NOT NULL REFERENCES "academic_sessions"("id") ON DELETE RESTRICT,
        "created_by_faculty_id" uuid NOT NULL REFERENCES "faculty"("id") ON DELETE RESTRICT,
        "examination_type" "public"."examinations_examination_type_enum" NOT NULL DEFAULT 'MCQ',
        "status" "public"."examinations_status_enum" NOT NULL DEFAULT 'DRAFT',
        "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "duration" integer NOT NULL,
        "total_marks" numeric(10, 2) NOT NULL DEFAULT 100,
        "passing_marks" numeric(10, 2) NOT NULL DEFAULT 40,
        "max_attempts" integer NOT NULL DEFAULT 1,
        "randomize_questions" boolean NOT NULL DEFAULT false,
        "randomize_options" boolean NOT NULL DEFAULT false,
        "negative_marking_type" "public"."examinations_negative_marking_type_enum" NOT NULL DEFAULT 'NONE',
        "negative_marking_value" numeric(10, 2) NOT NULL DEFAULT 0,
        "allow_negative_marks_below_zero" boolean NOT NULL DEFAULT false,
        "instructions" text,
        "result_visibility" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_examinations_department_id" ON "examinations" ("department_id");
      CREATE INDEX IF NOT EXISTS "idx_examinations_course_id" ON "examinations" ("course_id");
      CREATE INDEX IF NOT EXISTS "idx_examinations_semester_id" ON "examinations" ("semester_id");
      CREATE INDEX IF NOT EXISTS "idx_examinations_subject_id" ON "examinations" ("subject_id");
      CREATE INDEX IF NOT EXISTS "idx_examinations_session_id" ON "examinations" ("academic_session_id");
      CREATE INDEX IF NOT EXISTS "idx_examinations_created_by" ON "examinations" ("created_by_faculty_id");
      CREATE INDEX IF NOT EXISTS "idx_examinations_status" ON "examinations" ("status");
    `);

    // 13. Exam assignments
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "faculty_id" uuid NOT NULL REFERENCES "faculty"("id") ON DELETE CASCADE,
        "role" varchar(64) NOT NULL DEFAULT 'EVALUATOR',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_exam_assignments_test_faculty" UNIQUE ("test_id", "faculty_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_exam_assignments_test_id" ON "exam_assignments" ("test_id");
      CREATE INDEX IF NOT EXISTS "idx_exam_assignments_faculty_id" ON "exam_assignments" ("faculty_id");
    `);

    // 14. Exam eligible students
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam_eligible_students" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "is_eligible" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_exam_eligible_students_test_student" UNIQUE ("test_id", "student_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_exam_eligible_test_id" ON "exam_eligible_students" ("test_id");
      CREATE INDEX IF NOT EXISTS "idx_exam_eligible_student_id" ON "exam_eligible_students" ("student_id");
    `);

    // 15. Questions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "question_text" text NOT NULL,
        "question_type" "public"."questions_question_type_enum" NOT NULL DEFAULT 'MCQ',
        "marks" numeric(10, 2) NOT NULL DEFAULT 1,
        "negative_marks" numeric(10, 2) NOT NULL DEFAULT 0,
        "topic" varchar,
        "difficulty" "public"."questions_difficulty_enum",
        "question_order" integer NOT NULL DEFAULT 1,
        "answer_instructions" text,
        "evaluation_criteria" text,
        "expected_answer" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_questions_test_id" ON "questions" ("test_id");
    `);

    // 16. Question options
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_options" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
        "option_label" varchar(2) NOT NULL,
        "option_text" text NOT NULL,
        "is_correct" boolean NOT NULL DEFAULT false,
        "option_order" integer NOT NULL DEFAULT 1,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_question_options_question_id" ON "question_options" ("question_id");
    `);

    // 17. Question banks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_banks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(256) NOT NULL,
        "description" text,
        "department_id" uuid NOT NULL REFERENCES "departments"("id") ON DELETE RESTRICT,
        "subject_id" uuid NOT NULL REFERENCES "subjects"("id") ON DELETE RESTRICT,
        "created_by_faculty_id" uuid NOT NULL REFERENCES "faculty"("id") ON DELETE RESTRICT,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // 18. Question bank items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_bank_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question_bank_id" uuid NOT NULL REFERENCES "question_banks"("id") ON DELETE CASCADE,
        "question_text" text NOT NULL,
        "question_type" "public"."questions_question_type_enum" NOT NULL DEFAULT 'MCQ',
        "marks" numeric(10, 2) NOT NULL DEFAULT 1,
        "negative_marks" numeric(10, 2) NOT NULL DEFAULT 0,
        "options_json" jsonb,
        "answer_instructions" text,
        "evaluation_criteria" text,
        "expected_answer" text,
        "topic" varchar,
        "difficulty" "public"."questions_difficulty_enum",
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_qbi_bank_id" ON "question_bank_items" ("question_bank_id");
    `);

    // 19. Question imports
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_imports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "uploaded_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "original_filename" varchar(256) NOT NULL,
        "file_format" varchar(16) NOT NULL,
        "file_size" integer NOT NULL,
        "total_questions" integer NOT NULL DEFAULT 0,
        "valid_questions" integer NOT NULL DEFAULT 0,
        "invalid_questions" integer NOT NULL DEFAULT 0,
        "status" "public"."question_imports_status_enum" NOT NULL DEFAULT 'PENDING',
        "validation_summary" jsonb,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_question_imports_test_id" ON "question_imports" ("test_id");
    `);

    // 20. Question import items (staging table)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_import_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "import_id" uuid NOT NULL REFERENCES "question_imports"("id") ON DELETE CASCADE,
        "test_id" uuid NOT NULL,
        "question_number" integer NOT NULL,
        "question_type" "public"."questions_question_type_enum" NOT NULL DEFAULT 'MCQ',
        "question_text" text NOT NULL,
        "marks" numeric(10, 2) NOT NULL DEFAULT 1,
        "negative_marks" numeric(10, 2) NOT NULL DEFAULT 0,
        "options" jsonb,
        "correct_answer" varchar(16),
        "answer_instructions" text,
        "evaluation_criteria" text,
        "expected_answer" text,
        "topic" varchar,
        "difficulty" varchar,
        "is_valid" boolean NOT NULL DEFAULT true,
        "validation_errors" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_qii_import_id" ON "question_import_items" ("import_id");
      CREATE INDEX IF NOT EXISTS "idx_qii_test_id" ON "question_import_items" ("test_id");
    `);

    // 21. Question import errors
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_import_errors" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "import_id" uuid NOT NULL REFERENCES "question_imports"("id") ON DELETE CASCADE,
        "question_number" integer NOT NULL,
        "error_code" varchar(64) NOT NULL,
        "error_description" text NOT NULL,
        "field_name" varchar(64),
        "severity" varchar(16) NOT NULL DEFAULT 'ERROR',
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_qie_import_id" ON "question_import_errors" ("import_id");
    `);

    // 22. Exam attempts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam_attempts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "attempt_number" integer NOT NULL DEFAULT 1,
        "status" "public"."exam_attempts_status_enum" NOT NULL DEFAULT 'IN_PROGRESS',
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "submitted_at" TIMESTAMP WITH TIME ZONE,
        "total_questions" integer NOT NULL DEFAULT 0,
        "answered_count" integer NOT NULL DEFAULT 0,
        "ip_address" varchar(64),
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_exam_attempts_test_id" ON "exam_attempts" ("test_id");
      CREATE INDEX IF NOT EXISTS "idx_exam_attempts_student_id" ON "exam_attempts" ("student_id");
    `);

    // 23. Attempt questions (frozen randomization order)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "attempt_questions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
        "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
        "sequence_order" integer NOT NULL,
        "option_order_json" jsonb,
        "status" "public"."attempt_questions_status_enum" NOT NULL DEFAULT 'NOT_VISITED',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_attempt_questions" UNIQUE ("attempt_id", "question_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_aq_attempt_id" ON "attempt_questions" ("attempt_id");
      CREATE INDEX IF NOT EXISTS "idx_aq_question_id" ON "attempt_questions" ("question_id");
    `);

    // 24. Student answers
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "student_answers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "question_id" uuid NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
        "selected_option_id" uuid REFERENCES "question_options"("id") ON DELETE SET NULL,
        "selected_option_label" varchar(2),
        "descriptive_answer" text,
        "is_answered" boolean NOT NULL DEFAULT false,
        "is_marked_for_review" boolean NOT NULL DEFAULT false,
        "is_correct" boolean,
        "marks_awarded" numeric(10, 2) NOT NULL DEFAULT 0,
        "negative_marks_deducted" numeric(10, 2) NOT NULL DEFAULT 0,
        "evaluated_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_student_answers_attempt_question" UNIQUE ("attempt_id", "question_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_sa_attempt_id" ON "student_answers" ("attempt_id");
      CREATE INDEX IF NOT EXISTS "idx_sa_test_id" ON "student_answers" ("test_id");
      CREATE INDEX IF NOT EXISTS "idx_sa_question_id" ON "student_answers" ("question_id");
    `);

    // 25. Descriptive evaluations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "descriptive_evaluations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "student_answer_id" uuid NOT NULL UNIQUE REFERENCES "student_answers"("id") ON DELETE CASCADE,
        "evaluated_by_faculty_id" uuid REFERENCES "faculty"("id") ON DELETE SET NULL,
        "maximum_marks" numeric(10, 2) NOT NULL,
        "marks_awarded" numeric(10, 2) NOT NULL DEFAULT 0,
        "general_feedback" text,
        "criteria_scores_json" jsonb,
        "status" "public"."descriptive_evaluations_status_enum" NOT NULL DEFAULT 'PENDING',
        "submitted_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_de_test_id" ON "descriptive_evaluations" ("test_id");
      CREATE INDEX IF NOT EXISTS "idx_de_evaluated_by" ON "descriptive_evaluations" ("evaluated_by_faculty_id");
    `);

    // 26. Evaluation feedbacks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "evaluation_feedbacks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
        "faculty_id" uuid NOT NULL REFERENCES "faculty"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "feedback_text" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_ef_attempt_id" ON "evaluation_feedbacks" ("attempt_id");
    `);

    // 27. Results
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "results" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "attempt_id" uuid NOT NULL UNIQUE REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
        "total_questions" integer NOT NULL DEFAULT 0,
        "correct_answers" integer NOT NULL DEFAULT 0,
        "incorrect_answers" integer NOT NULL DEFAULT 0,
        "unanswered_count" integer NOT NULL DEFAULT 0,
        "mcq_marks_awarded" numeric(10, 2) NOT NULL DEFAULT 0,
        "negative_marks_deducted" numeric(10, 2) NOT NULL DEFAULT 0,
        "net_mcq_score" numeric(10, 2) NOT NULL DEFAULT 0,
        "descriptive_score" numeric(10, 2) NOT NULL DEFAULT 0,
        "final_marks" numeric(10, 2) NOT NULL DEFAULT 0,
        "maximum_marks" numeric(10, 2) NOT NULL DEFAULT 100,
        "percentage" numeric(5, 2) NOT NULL DEFAULT 0,
        "grade" varchar(8) NOT NULL DEFAULT 'F',
        "pass_fail_status" "public"."results_pass_fail_status_enum" NOT NULL DEFAULT 'FAIL',
        "status" "public"."results_status_enum" NOT NULL DEFAULT 'CALCULATED',
        "rank" integer,
        "calculated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "released_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_results_test_student_attempt" UNIQUE ("test_id", "student_id", "attempt_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_results_test_id" ON "results" ("test_id");
      CREATE INDEX IF NOT EXISTS "idx_results_student_id" ON "results" ("student_id");
    `);

    // 28. Result releases
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "result_releases" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "released_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "released_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "remarks" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_result_releases_test_id" ON "result_releases" ("test_id");
    `);

    // 29. Notifications
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'SYSTEM_ALERT',
        "title" varchar(256) NOT NULL,
        "message" text NOT NULL,
        "metadata" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
    `);

    // 30. Audit logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "action" "public"."audit_logs_action_enum" NOT NULL,
        "entity_type" varchar(64) NOT NULL,
        "entity_id" varchar(128),
        "details" jsonb,
        "ip_address" varchar(64),
        "user_agent" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" ON "audit_logs" ("entity_type", "entity_id");
    `);

    // 31. Exam activity logs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "exam_activity_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
        "test_id" uuid NOT NULL REFERENCES "examinations"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
        "event_type" varchar(64) NOT NULL,
        "event_data" jsonb,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "idx_eal_attempt_id" ON "exam_activity_logs" ("attempt_id");
      CREATE INDEX IF NOT EXISTS "idx_eal_test_id" ON "exam_activity_logs" ("test_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_activity_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "result_releases" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "results" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "evaluation_feedbacks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "descriptive_evaluations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_answers" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "attempt_questions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_attempts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_import_errors" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_import_items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_imports" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_bank_items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_banks" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_options" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "questions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_eligible_students" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_assignments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "examinations" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "faculty_subject_assignments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "students" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "faculty" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_sessions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subjects" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "semesters" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "courses" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_tokens" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE;`);
  }
}
