import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Department } from '../../departments/entities/department.entity.js';
import type { FacultySubjectAssignment } from './faculty-subject-assignment.entity.js';

@Entity('faculty')
export class Faculty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.faculty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'employee_id', type: 'varchar', unique: true, length: 64 })
  employeeId: string;

  @Column({ name: 'first_name', type: 'varchar', length: 128 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 128 })
  lastName: string;

  @Column({ type: 'varchar', length: 128, default: 'Assistant Professor' })
  designation: string;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  phone?: string;

  @Index()
  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany('FacultySubjectAssignment', 'faculty')
  subjectAssignments?: FacultySubjectAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
