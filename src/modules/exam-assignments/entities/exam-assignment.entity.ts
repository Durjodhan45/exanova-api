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
import { Examination } from '../../examinations/entities/examination.entity.js';
import { Faculty } from '../../faculty/entities/faculty.entity.js';

@Entity('exam_assignments')
@Unique(['testId', 'facultyId'])
export class ExamAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, (exam) => exam.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'faculty_id', type: 'uuid' })
  facultyId: string;

  @ManyToOne(() => Faculty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'faculty_id' })
  faculty: Faculty;

  @Column({ type: 'varchar', length: 64, default: 'EVALUATOR' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
