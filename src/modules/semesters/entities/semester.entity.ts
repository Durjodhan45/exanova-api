import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from '../../courses/entities/course.entity.js';
import type { Subject } from '../../subjects/entities/subject.entity.js';

@Entity('semesters')
@Unique(['courseId', 'semesterNumber'])
export class Semester {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (course) => course.semesters, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'semester_number', type: 'integer' })
  semesterNumber: number;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @OneToMany('Subject', 'semester')
  subjects?: Subject[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
