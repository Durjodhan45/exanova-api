import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { QuestionAttemptStatus } from '../../../shared/enums/index.js';
import { ExamAttempt } from './exam-attempt.entity.js';
import { Question } from '../../questions/entities/question.entity.js';

@Entity('attempt_questions')
@Unique(['attemptId', 'questionId'])
export class AttemptQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => ExamAttempt, (attempt) => attempt.attemptQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Index()
  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'sequence_order', type: 'integer' })
  sequenceOrder: number;

  @Column({ name: 'option_order_json', type: 'jsonb', nullable: true })
  optionOrderJson?: string[]; // Array of option IDs in randomized sequence

  @Column({
    type: 'enum',
    enum: QuestionAttemptStatus,
    default: QuestionAttemptStatus.NOT_VISITED,
  })
  status: QuestionAttemptStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
