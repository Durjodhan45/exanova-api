import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttemptStatus } from '../../../shared/enums/index.js';
import { Examination } from '../../examinations/entities/examination.entity.js';
import { Student } from '../../students/entities/student.entity.js';
import type { AttemptQuestion } from './attempt-question.entity.js';
import type { StudentAnswer } from '../../exam-submissions/entities/student-answer.entity.js';
import type { Result } from '../../results/entities/result.entity.js';

@Entity('exam_attempts')
export class ExamAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, (exam) => exam.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'attempt_number', type: 'integer', default: 1 })
  attemptNumber: number;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp with time zone', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'total_questions', type: 'integer', default: 0 })
  totalQuestions: number;

  @Column({ name: 'answered_count', type: 'integer', default: 0 })
  answeredCount: number;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @OneToMany('AttemptQuestion', 'attempt', { cascade: true })
  attemptQuestions?: AttemptQuestion[];

  @OneToMany('StudentAnswer', 'attempt', { cascade: true })
  answers?: StudentAnswer[];

  @OneToOne('Result', 'attempt')
  result?: Result;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
