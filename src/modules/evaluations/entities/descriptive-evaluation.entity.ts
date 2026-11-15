import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EvaluationStatus } from '../../../shared/enums/index.js';
import { Examination } from '../../examinations/entities/examination.entity.js';
import { StudentAnswer } from '../../exam-submissions/entities/student-answer.entity.js';
import { Faculty } from '../../faculty/entities/faculty.entity.js';

@Entity('descriptive_evaluations')
export class DescriptiveEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'student_answer_id', type: 'uuid', unique: true })
  studentAnswerId: string;

  @OneToOne(() => StudentAnswer, (answer) => answer.descriptiveEvaluation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_answer_id' })
  studentAnswer: StudentAnswer;

  @Index()
  @Column({ name: 'evaluated_by_faculty_id', type: 'uuid', nullable: true })
  evaluatedByFacultyId?: string;

  @ManyToOne(() => Faculty, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'evaluated_by_faculty_id' })
  evaluatedByFaculty?: Faculty;

  @Column({ name: 'maximum_marks', type: 'decimal', precision: 10, scale: 2 })
  maximumMarks: string;

  @Column({
    name: 'marks_awarded',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  marksAwarded: string;

  @Column({ name: 'general_feedback', type: 'text', nullable: true })
  generalFeedback?: string;

  @Column({ name: 'criteria_scores_json', type: 'jsonb', nullable: true })
  criteriaScoresJson?: Array<{ criterion: string; maxMarks: number; awardedMarks: number; comment?: string }>;

  @Column({
    type: 'enum',
    enum: EvaluationStatus,
    default: EvaluationStatus.PENDING,
  })
  status: EvaluationStatus;

  @Column({ name: 'submitted_at', type: 'timestamp with time zone', nullable: true })
  submittedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
