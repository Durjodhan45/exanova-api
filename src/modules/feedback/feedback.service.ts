import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationFeedback } from './entities/evaluation-feedback.entity.js';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectRepository(EvaluationFeedback)
    private readonly feedbackRepo: Repository<EvaluationFeedback>,
  ) {}

  async create(data: {
    attemptId: string;
    facultyId: string;
    studentId: string;
    feedbackText: string;
  }): Promise<EvaluationFeedback> {
    const feedback = this.feedbackRepo.create(data);
    return await this.feedbackRepo.save(feedback);
  }

  async findByAttemptId(attemptId: string): Promise<EvaluationFeedback[]> {
    return await this.feedbackRepo.find({
      where: { attemptId },
      relations: { faculty: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByStudentId(studentId: string): Promise<EvaluationFeedback[]> {
    return await this.feedbackRepo.find({
      where: { studentId },
      relations: { attempt: { examination: true }, faculty: true },
      order: { createdAt: 'DESC' },
    });
  }
}
