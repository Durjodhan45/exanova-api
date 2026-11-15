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
import { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity.js';
import { Examination } from '../../examinations/entities/examination.entity.js';
import { Question } from '../../questions/entities/question.entity.js';
import { QuestionOption } from '../../questions/entities/question-option.entity.js';
import type { DescriptiveEvaluation } from '../../evaluations/entities/descriptive-evaluation.entity.js';

@Entity('student_answers')
@Unique(['attemptId', 'questionId'])
export class StudentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => ExamAttempt, (attempt) => attempt.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Index()
  @Column({ name: 'selected_option_id', type: 'uuid', nullable: true })
  selectedOptionId?: string;

  @ManyToOne(() => QuestionOption, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption?: QuestionOption;

  @Column({ name: 'selected_option_label', type: 'varchar', length: 2, nullable: true })
  selectedOptionLabel?: string;

  @Column({ name: 'descriptive_answer', type: 'text', nullable: true })
  descriptiveAnswer?: string;

  @Column({ name: 'is_answered', type: 'boolean', default: false })
  isAnswered: boolean;

  @Column({ name: 'is_marked_for_review', type: 'boolean', default: false })
  isMarkedForReview: boolean;

  @Column({ name: 'is_correct', type: 'boolean', nullable: true })
  isCorrect?: boolean;

  @Column({
    name: 'marks_awarded',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  marksAwarded: string;

  @Column({
    name: 'negative_marks_deducted',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  negativeMarksDeducted: string;

  @Column({ name: 'evaluated_at', type: 'timestamp with time zone', nullable: true })
  evaluatedAt?: Date;

  @OneToOne('DescriptiveEvaluation', 'studentAnswer')
  descriptiveEvaluation?: DescriptiveEvaluation;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
