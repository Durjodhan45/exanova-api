import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuestionType } from '../../../shared/enums/index.js';
import { QuestionImport } from './question-import.entity.js';

export interface StagedOption {
  label: string;
  text: string;
  isCorrect: boolean;
}

@Entity('question_import_items')
export class QuestionImportItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'import_id', type: 'uuid' })
  importId: string;

  @ManyToOne(() => QuestionImport, (imp) => imp.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'import_id' })
  questionImport: QuestionImport;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @Column({ name: 'question_number', type: 'integer' })
  questionNumber: number;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MCQ,
  })
  questionType: QuestionType;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

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

  @Column({ type: 'jsonb', nullable: true })
  options?: StagedOption[];

  @Column({ name: 'correct_answer', type: 'varchar', length: 16, nullable: true })
  correctAnswer?: string;

  @Column({ name: 'answer_instructions', type: 'text', nullable: true })
  answerInstructions?: string;

  @Column({ name: 'evaluation_criteria', type: 'text', nullable: true })
  evaluationCriteria?: string;

  @Column({ name: 'expected_answer', type: 'text', nullable: true })
  expectedAnswer?: string;

  @Column({ type: 'varchar', nullable: true })
  topic?: string;

  @Column({ type: 'varchar', nullable: true })
  difficulty?: string;

  @Column({ name: 'is_valid', type: 'boolean', default: true })
  isValid: boolean;

  @Column({ name: 'validation_errors', type: 'jsonb', nullable: true })
  validationErrors?: Array<{ field: string; error: string; code?: string }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
