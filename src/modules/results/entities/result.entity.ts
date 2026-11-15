import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PassFailStatus, ResultStatus } from '../../../shared/enums/index.js';
import { Examination } from '../../examinations/entities/examination.entity.js';
import { Student } from '../../students/entities/student.entity.js';
import { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity.js';

@Entity('results')
@Unique(['testId', 'studentId', 'attemptId'])
export class Result {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, (exam) => exam.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Index()
  @Column({ name: 'attempt_id', type: 'uuid', unique: true })
  attemptId: string;

  @OneToOne(() => ExamAttempt, (attempt) => attempt.result, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Column({ name: 'total_questions', type: 'integer', default: 0 })
  totalQuestions: number;

  @Column({ name: 'correct_answers', type: 'integer', default: 0 })
  correctAnswers: number;

  @Column({ name: 'incorrect_answers', type: 'integer', default: 0 })
  incorrectAnswers: number;

  @Column({ name: 'unanswered_count', type: 'integer', default: 0 })
  unansweredCount: number;

  @Column({
    name: 'mcq_marks_awarded',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  mcqMarksAwarded: string;

  @Column({
    name: 'negative_marks_deducted',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  negativeMarksDeducted: string;

  @Column({
    name: 'net_mcq_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  netMcqScore: string;

  @Column({
    name: 'descriptive_score',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  descriptiveScore: string;

  @Column({
    name: 'final_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  finalMarks: string;

  @Column({
    name: 'maximum_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 100,
  })
  maximumMarks: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  percentage: string;

  @Column({ type: 'varchar', length: 8, default: 'F' })
  grade: string;

  @Column({
    name: 'pass_fail_status',
    type: 'enum',
    enum: PassFailStatus,
    default: PassFailStatus.FAIL,
  })
  passFailStatus: PassFailStatus;

  @Column({
    type: 'enum',
    enum: ResultStatus,
    default: ResultStatus.CALCULATED,
  })
  status: ResultStatus;

  @Column({ type: 'integer', nullable: true })
  rank?: number;

  @Column({ name: 'calculated_at', type: 'timestamp with time zone' })
  calculatedAt: Date;

  @Column({ name: 'released_at', type: 'timestamp with time zone', nullable: true })
  releasedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
