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
import { Examination } from './examination.entity.js';
import { Student } from '../../students/entities/student.entity.js';

@Entity('exam_eligible_students')
@Unique(['testId', 'studentId'])
export class ExamEligibleStudent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, (exam) => exam.eligibleStudents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'is_eligible', type: 'boolean', default: true })
  isEligible: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
