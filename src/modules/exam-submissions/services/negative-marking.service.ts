import { Injectable } from '@nestjs/common';
import { NegativeMarkingType } from '../../../shared/enums/index.js';
import { addDecimals, roundToPrecision, subtractDecimals } from '../../../common/utils/index.js';

export interface ScoreItemInput {
  questionMarks: number;
  questionNegativeMarks: number;
  isAnswered: boolean;
  isCorrect: boolean;
}

export interface ExamScoringConfig {
  negativeMarkingType: NegativeMarkingType;
  negativeMarkingValue: number; // e.g. 0.25 (fixed value) or 0.25 (1/4th fraction)
  allowNegativeMarksBelowZero: boolean;
}

@Injectable()
export class NegativeMarkingService {
  /**
   * Calculates marks awarded and negative penalty for a single MCQ question
   */
  calculateQuestionScore(
    input: ScoreItemInput,
    config: ExamScoringConfig,
  ): { marksAwarded: number; negativeMarksDeducted: number } {
    if (!input.isAnswered) {
      // Unanswered receives zero penalty
      return { marksAwarded: 0, negativeMarksDeducted: 0 };
    }

    if (input.isCorrect) {
      return {
        marksAwarded: roundToPrecision(input.questionMarks),
        negativeMarksDeducted: 0,
      };
    }

    // Incorrect answer: determine penalty based on exam configuration
    let penalty = 0;
    switch (config.negativeMarkingType) {
      case NegativeMarkingType.NONE:
        penalty = 0;
        break;

      case NegativeMarkingType.FIXED:
        penalty = config.negativeMarkingValue > 0 ? config.negativeMarkingValue : 0;
        break;

      case NegativeMarkingType.FRACTION:
        // Fraction of question's maximum marks (e.g. 1/3 or 1/4)
        const fraction = config.negativeMarkingValue > 0 ? config.negativeMarkingValue : 0.25;
        penalty = input.questionMarks * fraction;
        break;

      case NegativeMarkingType.CUSTOM:
        // Question-level custom negative marks
        penalty = input.questionNegativeMarks > 0 ? input.questionNegativeMarks : 0;
        break;

      default:
        penalty = 0;
    }

    return {
      marksAwarded: 0,
      negativeMarksDeducted: roundToPrecision(penalty),
    };
  }

  /**
   * Calculates overall net MCQ score across all evaluated MCQ questions
   */
  calculateTotalMcqScore(
    scores: Array<{ marksAwarded: number; negativeMarksDeducted: number }>,
    allowNegativeMarksBelowZero = false,
  ): {
    totalMarksAwarded: number;
    totalNegativeDeducted: number;
    netMcqScore: number;
  } {
    let totalMarksAwarded = 0;
    let totalNegativeDeducted = 0;

    for (const s of scores) {
      totalMarksAwarded = addDecimals(totalMarksAwarded, s.marksAwarded);
      totalNegativeDeducted = addDecimals(totalNegativeDeducted, s.negativeMarksDeducted);
    }

    let net = subtractDecimals(totalMarksAwarded, totalNegativeDeducted);
    if (!allowNegativeMarksBelowZero && net < 0) {
      net = 0;
    }

    return {
      totalMarksAwarded: roundToPrecision(totalMarksAwarded),
      totalNegativeDeducted: roundToPrecision(totalNegativeDeducted),
      netMcqScore: roundToPrecision(net),
    };
  }
}
