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
import { ImportStatus } from '../../../shared/enums/index.js';
import { Examination } from '../../examinations/entities/examination.entity.js';
import { User } from '../../users/entities/user.entity.js';
import type { QuestionImportItem } from './question-import-item.entity.js';
import type { QuestionImportError } from './question-import-error.entity.js';

@Entity('question_imports')
export class QuestionImport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'uploaded_by_user_id', type: 'uuid' })
  uploadedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedByUser: User;

  @Column({ name: 'original_filename', type: 'varchar', length: 256 })
  originalFilename: string;

  @Column({ name: 'file_format', type: 'varchar', length: 16 })
  fileFormat: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize: number;

  @Column({ name: 'total_questions', type: 'integer', default: 0 })
  totalQuestions: number;

  @Column({ name: 'valid_questions', type: 'integer', default: 0 })
  validQuestions: number;

  @Column({ name: 'invalid_questions', type: 'integer', default: 0 })
  invalidQuestions: number;

  @Column({
    type: 'enum',
    enum: ImportStatus,
    default: ImportStatus.PENDING,
  })
  status: ImportStatus;

  @Column({ name: 'validation_summary', type: 'jsonb', nullable: true })
  validationSummary?: Record<string, unknown>;

  @Column({ name: 'confirmed_at', type: 'timestamp with time zone', nullable: true })
  confirmedAt?: Date;

  @OneToMany('QuestionImportItem', 'questionImport', { cascade: true })
  items?: QuestionImportItem[];

  @OneToMany('QuestionImportError', 'questionImport', { cascade: true })
  errors?: QuestionImportError[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
