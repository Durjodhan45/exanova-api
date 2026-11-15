import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity.js';
import { Examination } from '../../examinations/entities/examination.entity.js';
import { Student } from '../../students/entities/student.entity.js';

@Entity('exam_activity_logs')
export class ExamActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => ExamAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'event_type', type: 'varchar', length: 64 }) // 'TAB_BLUR', 'TAB_FOCUS', 'WINDOW_RESIZE', 'QUESTION_VISIT', 'ANSWER_SAVE'
  eventType: string;

  @Column({ name: 'event_data', type: 'jsonb', nullable: true })
  eventData?: Record<string, unknown>;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
}
