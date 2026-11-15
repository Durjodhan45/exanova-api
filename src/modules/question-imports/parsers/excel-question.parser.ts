import ExcelJS from 'exceljs';
import { DifficultyLevel, QuestionType } from '../../../shared/enums/index.js';

export interface ParsedQuestionItem {
  questionNumber: number;
  questionType: QuestionType;
  questionText: string;
  marks: string;
  negativeMarks: string;
  options?: Array<{ label: string; text: string; isCorrect: boolean }>;
  correctAnswer?: string;
  answerInstructions?: string;
  evaluationCriteria?: string;
  expectedAnswer?: string;
  topic?: string;
  difficulty?: string;
  isValid: boolean;
  errors: Array<{ field: string; error: string; code: string }>;
}

export class ExcelQuestionParser {
  static async parseBuffer(buffer: Buffer): Promise<{
    items: ParsedQuestionItem[];
    total: number;
    valid: number;
    invalid: number;
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel workbook contains no sheets');
    }

    const items: ParsedQuestionItem[] = [];
    let questionCounter = 1;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Extract cells
      // 1: Question ID / No, 2: Question, 3: Option A (or Max Marks), 4: Option B (or Answer Instructions), ...
      const col1 = row.getCell(1).text?.trim();
      const questionText = row.getCell(2).text?.trim();

      if (!col1 && !questionText) return; // empty row

      const errors: Array<{ field: string; error: string; code: string }> = [];

      // Check if row is MCQ or Descriptive based on headers/content
      // In MCQ template: col3=Option A, col4=Option B, col5=Option C, col6=Option D, col7=Correct Answer, col8=Marks, col9=Negative Marks, col10=Subject, col11=Topic, col12=Difficulty
      // In Descriptive template: col3=Maximum Marks, col4=Answer Instructions, col5=Evaluation Criteria, col6=Expected Answer, col7=Topic, col8=Difficulty
      const col3 = row.getCell(3).text?.trim();
      const col4 = row.getCell(4).text?.trim();
      const col5 = row.getCell(5).text?.trim();
      const col6 = row.getCell(6).text?.trim();
      const col7 = row.getCell(7).text?.trim();
      const col8 = row.getCell(8).text?.trim();
      const col9 = row.getCell(9).text?.trim();
      const col10 = row.getCell(10).text?.trim();
      const col11 = row.getCell(11).text?.trim();
      const col12 = row.getCell(12).text?.trim();

      const isMcq = Boolean(col4 && col5 && (col7?.length === 1 || ['A', 'B', 'C', 'D'].includes(col7?.toUpperCase() || '')));

      if (!questionText) {
        errors.push({ field: 'questionText', error: 'Question text is required', code: 'MISSING_QUESTION_TEXT' });
      }

      if (isMcq) {
        const optionA = col3;
        const optionB = col4;
        const optionC = col5;
        const optionD = col6;
        const rawCorrect = (col7 || '').toUpperCase();
        const marks = col8 || '1.00';
        const negMarks = col9 || '0.00';
        const topic = col11 || col10;
        const difficulty = col12;

        if (!optionA) errors.push({ field: 'optionA', error: 'Option A is missing', code: 'MISSING_OPTION_A' });
        if (!optionB) errors.push({ field: 'optionB', error: 'Option B is missing', code: 'MISSING_OPTION_B' });
        if (!rawCorrect) {
          errors.push({ field: 'correctAnswer', error: 'Correct answer is missing', code: 'MISSING_CORRECT_ANSWER' });
        } else if (!['A', 'B', 'C', 'D'].includes(rawCorrect)) {
          errors.push({
            field: 'correctAnswer',
            error: `Correct answer must be A, B, C, or D (found: '${rawCorrect}')`,
            code: 'INVALID_CORRECT_ANSWER',
          });
        }

        const options = [
          { label: 'A', text: optionA || '', isCorrect: rawCorrect === 'A' },
          { label: 'B', text: optionB || '', isCorrect: rawCorrect === 'B' },
          ...(optionC ? [{ label: 'C', text: optionC, isCorrect: rawCorrect === 'C' }] : []),
          ...(optionD ? [{ label: 'D', text: optionD, isCorrect: rawCorrect === 'D' }] : []),
        ];

        items.push({
          questionNumber: questionCounter++,
          questionType: QuestionType.MCQ,
          questionText: questionText || '',
          marks: isNaN(parseFloat(marks)) ? '1.00' : marks,
          negativeMarks: isNaN(parseFloat(negMarks)) ? '0.00' : negMarks,
          options,
          correctAnswer: rawCorrect,
          topic,
          difficulty: difficulty?.toUpperCase(),
          isValid: errors.length === 0,
          errors,
        });
      } else {
        // Descriptive question
        const maxMarks = col3 || '10.00';
        const answerInstructions = col4;
        const evaluationCriteria = col5;
        const expectedAnswer = col6;
        const topic = col7;
        const difficulty = col8;

        if (isNaN(parseFloat(maxMarks)) || parseFloat(maxMarks) <= 0) {
          errors.push({ field: 'marks', error: 'Maximum marks must be a positive number', code: 'INVALID_MARKS' });
        }

        items.push({
          questionNumber: questionCounter++,
          questionType: QuestionType.DESCRIPTIVE,
          questionText: questionText || '',
          marks: isNaN(parseFloat(maxMarks)) ? '10.00' : maxMarks,
          negativeMarks: '0.00',
          answerInstructions,
          evaluationCriteria,
          expectedAnswer,
          topic,
          difficulty: difficulty?.toUpperCase(),
          isValid: errors.length === 0,
          errors,
        });
      }
    });

    const valid = items.filter((i) => i.isValid).length;
    const invalid = items.length - valid;

    return {
      items,
      total: items.length,
      valid,
      invalid,
    };
  }
}
