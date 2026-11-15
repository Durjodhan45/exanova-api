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
import { DifficultyLevel, QuestionType } from '../../../shared/enums/index.js';
import { QuestionBank } from './question-bank.entity.js';

@Entity('question_bank_items')
export class QuestionBankItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'question_bank_id', type: 'uuid' })
  questionBankId: string;

  @ManyToOne(() => QuestionBank, (bank) => bank.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_bank_id' })
  questionBank: QuestionBank;

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

  @Column({ type: 'jsonb', nullable: true })
  optionsJson?: Array<{
    optionLabel: string;
    optionText: string;
    isCorrect: boolean;
  }>;

  @Column({ name: 'answer_instructions', type: 'text', nullable: true })
  answerInstructions?: string;

  @Column({ name: 'evaluation_criteria', type: 'text', nullable: true })
  evaluationCriteria?: string;

  @Column({ name: 'expected_answer', type: 'text', nullable: true })
  expectedAnswer?: string;

  @Column({ type: 'varchar', nullable: true })
  topic?: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    nullable: true,
  })
  difficulty?: DifficultyLevel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
