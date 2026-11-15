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
import { Faculty } from './faculty.entity.js';
import { Subject } from '../../subjects/entities/subject.entity.js';
import { AcademicSession } from '../../academic-sessions/entities/academic-session.entity.js';

@Entity('faculty_subject_assignments')
@Unique(['facultyId', 'subjectId', 'academicSessionId'])
export class FacultySubjectAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'faculty_id', type: 'uuid' })
  facultyId: string;

  @ManyToOne(() => Faculty, (faculty) => faculty.subjectAssignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'faculty_id' })
  faculty: Faculty;

  @Index()
  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId: string;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Index()
  @Column({ name: 'academic_session_id', type: 'uuid' })
  academicSessionId: string;

  @ManyToOne(() => AcademicSession, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'academic_session_id' })
  academicSession: AcademicSession;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
