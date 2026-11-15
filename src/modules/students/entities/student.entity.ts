import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { Department } from '../../departments/entities/department.entity.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Semester } from '../../semesters/entities/semester.entity.js';
import { AcademicSession } from '../../academic-sessions/entities/academic-session.entity.js';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'roll_number', type: 'varchar', unique: true, length: 64 })
  rollNumber: string;

  @Column({ name: 'registration_number', type: 'varchar', unique: true, nullable: true, length: 64 })
  registrationNumber?: string;

  @Column({ name: 'first_name', type: 'varchar', length: 128 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 128 })
  lastName: string;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  phone?: string;

  @Index()
  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Index()
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index()
  @Column({ name: 'current_semester_id', type: 'uuid' })
  currentSemesterId: string;

  @ManyToOne(() => Semester, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'current_semester_id' })
  currentSemester: Semester;

  @Index()
  @Column({ name: 'academic_session_id', type: 'uuid' })
  academicSessionId: string;

  @ManyToOne(() => AcademicSession, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'academic_session_id' })
  academicSession: AcademicSession;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
