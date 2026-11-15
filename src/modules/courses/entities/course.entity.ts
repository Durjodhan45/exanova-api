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
import type { Semester } from '../../semesters/entities/semester.entity.js';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, (dept) => dept.courses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true, length: 32 })
  code: string;

  @Column({ name: 'duration_years', type: 'integer', default: 4 })
  durationYears: number;

  @Column({ name: 'total_semesters', type: 'integer', default: 8 })
  totalSemesters: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany('Semester', 'course')
  semesters?: Semester[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
