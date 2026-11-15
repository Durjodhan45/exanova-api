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
import { DifficultyLevel, QuestionType } from '../../../shared/enums/index.js';
import { Examination } from '../../examinations/entities/examination.entity.js';
import type { QuestionOption } from './question-option.entity.js';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, (examination) => examination.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MCQ,
  })
  questionType: QuestionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  marks: string;

  @Column({
    name: 'negative_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  negativeMarks: string;

  @Column({ type: 'varchar', nullable: true })
  topic?: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    nullable: true,
  })
  difficulty?: DifficultyLevel;

  @Column({ name: 'question_order', type: 'integer', default: 1 })
  questionOrder: number;

  @Column({ name: 'answer_instructions', type: 'text', nullable: true })
  answerInstructions?: string;

  @Column({ name: 'evaluation_criteria', type: 'text', nullable: true })
  evaluationCriteria?: string;

  @Column({ name: 'expected_answer', type: 'text', nullable: true })
  expectedAnswer?: string;

  @OneToMany('QuestionOption', 'question', { cascade: true })
  options?: QuestionOption[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
