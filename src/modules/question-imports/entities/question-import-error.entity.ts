import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuestionImport } from './question-import.entity.js';

@Entity('question_import_errors')
export class QuestionImportError {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'import_id', type: 'uuid' })
  importId: string;

  @ManyToOne(() => QuestionImport, (imp) => imp.errors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'import_id' })
  questionImport: QuestionImport;

  @Column({ name: 'question_number', type: 'integer' })
  questionNumber: number;

  @Column({ name: 'error_code', type: 'varchar', length: 64 })
  errorCode: string;

  @Column({ name: 'error_description', type: 'text' })
  errorDescription: string;

  @Column({ name: 'field_name', type: 'varchar', length: 64, nullable: true })
  fieldName?: string;

  @Column({ type: 'varchar', length: 16, default: 'ERROR' })
  severity: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
