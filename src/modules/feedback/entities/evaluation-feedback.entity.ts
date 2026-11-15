import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamAttempt } from '../../exam-attempts/entities/exam-attempt.entity.js';
import { Faculty } from '../../faculty/entities/faculty.entity.js';
import { Student } from '../../students/entities/student.entity.js';

@Entity('evaluation_feedbacks')
export class EvaluationFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'attempt_id', type: 'uuid' })
  attemptId: string;

  @ManyToOne(() => ExamAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Index()
  @Column({ name: 'faculty_id', type: 'uuid' })
  facultyId: string;

  @ManyToOne(() => Faculty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'faculty_id' })
  faculty: Faculty;

  @Index()
  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'feedback_text', type: 'text' })
  feedbackText: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
