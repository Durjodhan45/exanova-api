import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  ExaminationStatus,
  ExaminationType,
  NegativeMarkingType,
} from '../../../shared/enums/index.js';
import { Department } from '../../departments/entities/department.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Semester } from '../../semesters/entities/semester.entity.js';
import { Subject } from '../../subjects/entities/subject.entity.js';
import { AcademicSession } from '../../academic-sessions/entities/academic-session.entity.js';
import { Faculty } from '../../faculty/entities/faculty.entity.js';
import type { Question } from '../../questions/entities/question.entity.js';
import type { ExamAssignment } from '../../exam-assignments/entities/exam-assignment.entity.js';
import type { ExamEligibleStudent } from './exam-eligible-student.entity.js';
import type { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity.js';
import type { Result } from '../../results/entities/result.entity.js';

@Entity('examinations')
export class Examination {
  @PrimaryGeneratedColumn('uuid')
  id: string; // The authoritative Test ID (UUID)

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ name: 'examination_code', type: 'varchar', unique: true, length: 64 })
  examinationCode: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index()
  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Index()
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index()
  @Column({ name: 'semester_id', type: 'uuid' })
  semesterId: string;

  @ManyToOne(() => Semester, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'semester_id' })
  semester: Semester;

  @Index()
  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Index()
  @Column({ name: 'academic_session_id', type: 'uuid' })
  academicSessionId: string;

  @ManyToOne(() => AcademicSession, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'academic_session_id' })
  academicSession: AcademicSession;

  @Index()
  @Column({ name: 'created_by_faculty_id', type: 'uuid' })
  createdByFacultyId: string;

  @ManyToOne(() => Faculty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_faculty_id' })
  createdByFaculty: Faculty;

  @Column({
    name: 'examination_type',
    type: 'enum',
    enum: ExaminationType,
    default: ExaminationType.MCQ,
  })
  examinationType: ExaminationType;

  @Column({
    type: 'enum',
    enum: ExaminationStatus,
    default: ExaminationStatus.DRAFT,
  })
  status: ExaminationStatus;

  @Column({ name: 'start_date', type: 'timestamp with time zone' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamp with time zone' })
  endDate: Date;

  @Column({ type: 'integer' })
  duration: number; // in minutes

  @Column({ name: 'total_marks', type: 'decimal', precision: 10, scale: 2, default: 100 })
  totalMarks: string;

  @Column({ name: 'passing_marks', type: 'decimal', precision: 10, scale: 2, default: 40 })
  passingMarks: string;

  @Column({ name: 'max_attempts', type: 'integer', default: 1 })
  maxAttempts: number;

  @Column({ name: 'randomize_questions', type: 'boolean', default: false })
  randomizeQuestions: boolean;

  @Column({ name: 'randomize_options', type: 'boolean', default: false })
  randomizeOptions: boolean;

  @Column({
    name: 'negative_marking_type',
    type: 'enum',
    enum: NegativeMarkingType,
    default: NegativeMarkingType.NONE,
  })
  negativeMarkingType: NegativeMarkingType;

  @Column({
    name: 'negative_marking_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  negativeMarkingValue: string;

  @Column({ name: 'allow_negative_marks_below_zero', type: 'boolean', default: false })
  allowNegativeMarksBelowZero: boolean;

  @Column({ type: 'text', nullable: true })
  instructions?: string;

  @Column({ name: 'result_visibility', type: 'boolean', default: false })
  resultVisibility: boolean;

  @OneToMany('Question', 'examination')
  questions?: Question[];

  @OneToMany('ExamAssignment', 'examination')
  assignments?: ExamAssignment[];

  @OneToMany('ExamEligibleStudent', 'examination')
  eligibleStudents?: ExamEligibleStudent[];

  @OneToMany('ExamAttempt', 'examination')
  attempts?: ExamAttempt[];

  @OneToMany('Result', 'examination')
  results?: Result[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
