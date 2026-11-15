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
import { Department } from '../../departments/entities/department.entity.js';
import { Subject } from '../../subjects/entities/subject.entity.js';
import { Faculty } from '../../faculty/entities/faculty.entity.js';
import type { QuestionBankItem } from './question-bank-item.entity.js';

@Entity('question_banks')
export class QuestionBank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 256 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index()
  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Index()
  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Index()
  @Column({ name: 'created_by_faculty_id', type: 'uuid' })
  createdByFacultyId: string;

  @ManyToOne(() => Faculty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_faculty_id' })
  createdByFaculty: Faculty;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany('QuestionBankItem', 'questionBank')
  items?: QuestionBankItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
