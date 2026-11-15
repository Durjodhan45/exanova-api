import { describe, it, expect, beforeEach } from 'vitest';
import { NegativeMarkingService } from '../../src/modules/exam-submissions/services/negative-marking.service.js';
import { NegativeMarkingType } from '../../src/shared/enums/index.js';

describe('NegativeMarkingService', () => {
  let service: NegativeMarkingService;

  beforeEach(() => {
    service = new NegativeMarkingService();
  });

  describe('calculateQuestionScore', () => {
    it('should award 0 marks and 0 penalty for unanswered question', () => {
      const result = service.calculateQuestionScore(
        { questionMarks: 4, questionNegativeMarks: 1, isAnswered: false, isCorrect: false },
        { negativeMarkingType: NegativeMarkingType.FIXED, negativeMarkingValue: 1, allowNegativeMarksBelowZero: false },
      );
      expect(result.marksAwarded).toBe(0);
      expect(result.negativeMarksDeducted).toBe(0);
    });

    it('should award full marks and 0 penalty for correct answer', () => {
      const result = service.calculateQuestionScore(
        { questionMarks: 4, questionNegativeMarks: 1, isAnswered: true, isCorrect: true },
        { negativeMarkingType: NegativeMarkingType.FIXED, negativeMarkingValue: 1, allowNegativeMarksBelowZero: false },
      );
      expect(result.marksAwarded).toBe(4);
      expect(result.negativeMarksDeducted).toBe(0);
    });

    it('should apply 0 penalty when NegativeMarkingType is NONE', () => {
      const result = service.calculateQuestionScore(
        { questionMarks: 2, questionNegativeMarks: 0.5, isAnswered: true, isCorrect: false },
        { negativeMarkingType: NegativeMarkingType.NONE, negativeMarkingValue: 0.5, allowNegativeMarksBelowZero: false },
      );
      expect(result.marksAwarded).toBe(0);
      expect(result.negativeMarksDeducted).toBe(0);
    });

    it('should deduct configured FIXED penalty on incorrect answer', () => {
      const result = service.calculateQuestionScore(
        { questionMarks: 2, questionNegativeMarks: 0, isAnswered: true, isCorrect: false },
        { negativeMarkingType: NegativeMarkingType.FIXED, negativeMarkingValue: 0.5, allowNegativeMarksBelowZero: false },
      );
      expect(result.marksAwarded).toBe(0);
      expect(result.negativeMarksDeducted).toBe(0.5);
    });

    it('should deduct FRACTION of question marks on incorrect answer', () => {
      const result = service.calculateQuestionScore(
        { questionMarks: 4, questionNegativeMarks: 0, isAnswered: true, isCorrect: false },
        { negativeMarkingType: NegativeMarkingType.FRACTION, negativeMarkingValue: 0.25, allowNegativeMarksBelowZero: false },
      );
      expect(result.marksAwarded).toBe(0);
      expect(result.negativeMarksDeducted).toBe(1.0); // 4 * 0.25 = 1.0
    });

    it('should deduct CUSTOM question-level negative marks on incorrect answer', () => {
      const result = service.calculateQuestionScore(
        { questionMarks: 3, questionNegativeMarks: 0.75, isAnswered: true, isCorrect: false },
        { negativeMarkingType: NegativeMarkingType.CUSTOM, negativeMarkingValue: 0, allowNegativeMarksBelowZero: false },
      );
      expect(result.marksAwarded).toBe(0);
      expect(result.negativeMarksDeducted).toBe(0.75);
    });
  });

  describe('calculateTotalMcqScore', () => {
    it('should calculate net MCQ score correctly', () => {
      const scores = [
        { marksAwarded: 2, negativeMarksDeducted: 0 },
        { marksAwarded: 2, negativeMarksDeducted: 0 },
        { marksAwarded: 0, negativeMarksDeducted: 0.5 },
        { marksAwarded: 0, negativeMarksDeducted: 0 },
      ];
      const result = service.calculateTotalMcqScore(scores, false);
      expect(result.totalMarksAwarded).toBe(4);
      expect(result.totalNegativeDeducted).toBe(0.5);
      expect(result.netMcqScore).toBe(3.5);
    });

    it('should floor net MCQ score at 0 if allowNegativeMarksBelowZero is false', () => {
      const scores = [
        { marksAwarded: 0, negativeMarksDeducted: 2 },
        { marksAwarded: 0, negativeMarksDeducted: 1 },
      ];
      const result = service.calculateTotalMcqScore(scores, false);
      expect(result.totalMarksAwarded).toBe(0);
      expect(result.totalNegativeDeducted).toBe(3);
      expect(result.netMcqScore).toBe(0);
    });

    it('should allow negative score below 0 if allowNegativeMarksBelowZero is true', () => {
      const scores = [
        { marksAwarded: 1, negativeMarksDeducted: 2.5 },
      ];
      const result = service.calculateTotalMcqScore(scores, true);
      expect(result.totalMarksAwarded).toBe(1);
      expect(result.totalNegativeDeducted).toBe(2.5);
      expect(result.netMcqScore).toBe(-1.5);
    });
  });
});
