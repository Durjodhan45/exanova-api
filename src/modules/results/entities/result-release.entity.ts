import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Examination } from '../../examinations/entities/examination.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('result_releases')
export class ResultRelease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'test_id', type: 'uuid' })
  testId: string;

  @ManyToOne(() => Examination, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  examination: Examination;

  @Index()
  @Column({ name: 'released_by_user_id', type: 'uuid' })
  releasedByUserId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'released_by_user_id' })
  releasedByUser: User;

  @Column({ name: 'released_at', type: 'timestamp with time zone' })
  releasedAt: Date;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
