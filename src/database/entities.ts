import { User } from '../modules/users/entities/user.entity.js';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity.js';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity.js';
import { Department } from '../modules/departments/entities/department.entity.js';
import { Course } from '../modules/courses/entities/course.entity.js';
import { Semester } from '../modules/semesters/entities/semester.entity.js';
import { Subject } from '../modules/subjects/entities/subject.entity.js';
import { AcademicSession } from '../modules/academic-sessions/entities/academic-session.entity.js';
import { Student } from '../modules/students/entities/student.entity.js';
import { Faculty } from '../modules/faculty/entities/faculty.entity.js';
import { FacultySubjectAssignment } from '../modules/faculty/entities/faculty-subject-assignment.entity.js';
import { Examination } from '../modules/examinations/entities/examination.entity.js';
import { ExamEligibleStudent } from '../modules/examinations/entities/exam-eligible-student.entity.js';
import { ExamAssignment } from '../modules/exam-assignments/entities/exam-assignment.entity.js';
import { Question } from '../modules/questions/entities/question.entity.js';
import { QuestionOption } from '../modules/questions/entities/question-option.entity.js';
import { QuestionBank } from '../modules/question-banks/entities/question-bank.entity.js';
import { QuestionBankItem } from '../modules/question-banks/entities/question-bank-item.entity.js';
import { QuestionImport } from '../modules/question-imports/entities/question-import.entity.js';
import { QuestionImportItem } from '../modules/question-imports/entities/question-import-item.entity.js';
import { QuestionImportError } from '../modules/question-imports/entities/question-import-error.entity.js';
import { ExamAttempt } from '../modules/exam-attempts/entities/exam-attempt.entity.js';
import { AttemptQuestion } from '../modules/exam-attempts/entities/attempt-question.entity.js';
import { StudentAnswer } from '../modules/exam-submissions/entities/student-answer.entity.js';
import { DescriptiveEvaluation } from '../modules/evaluations/entities/descriptive-evaluation.entity.js';
import { EvaluationFeedback } from '../modules/feedback/entities/evaluation-feedback.entity.js';
import { Result } from '../modules/results/entities/result.entity.js';
import { ResultRelease } from '../modules/results/entities/result-release.entity.js';
import { Notification } from '../modules/notifications/entities/notification.entity.js';
import { AuditLog } from '../modules/audit-logs/entities/audit-log.entity.js';
import { ExamActivityLog } from '../modules/audit-logs/entities/exam-activity-log.entity.js';

export const ALL_ENTITIES = [
  User,
  RefreshToken,
  PasswordResetToken,
  Department,
  Course,
  Semester,
  Subject,
  AcademicSession,
  Student,
  Faculty,
  FacultySubjectAssignment,
  Examination,
  ExamEligibleStudent,
  ExamAssignment,
  Question,
  QuestionOption,
  QuestionBank,
  QuestionBankItem,
  QuestionImport,
  QuestionImportItem,
  QuestionImportError,
  ExamAttempt,
  AttemptQuestion,
  StudentAnswer,
  DescriptiveEvaluation,
  EvaluationFeedback,
  Result,
  ResultRelease,
  Notification,
  AuditLog,
  ExamActivityLog,
];

export {
  User,
  RefreshToken,
  PasswordResetToken,
  Department,
  Course,
  Semester,
  Subject,
  AcademicSession,
  Student,
  Faculty,
  FacultySubjectAssignment,
  Examination,
  ExamEligibleStudent,
  ExamAssignment,
  Question,
  QuestionOption,
  QuestionBank,
  QuestionBankItem,
  QuestionImport,
  QuestionImportItem,
  QuestionImportError,
  ExamAttempt,
  AttemptQuestion,
  StudentAnswer,
  DescriptiveEvaluation,
  EvaluationFeedback,
  Result,
  ResultRelease,
  Notification,
  AuditLog,
  ExamActivityLog,
};
