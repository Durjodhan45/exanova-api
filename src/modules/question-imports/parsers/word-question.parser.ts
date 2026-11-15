import mammoth from 'mammoth';
import { QuestionType } from '../../../shared/enums/index.js';
import type { ParsedQuestionItem } from './excel-question.parser.js';

export class WordQuestionParser {
  static async parseBuffer(buffer: Buffer): Promise<{
    items: ParsedQuestionItem[];
    total: number;
    valid: number;
    invalid: number;
  }> {
    const { value: rawText } = await mammoth.extractRawText({ buffer });
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Word document contains no readable text');
    }

    const items: ParsedQuestionItem[] = [];
    // Split document into blocks by "Question \d+:" or "Question \d+"
    const questionBlocks = rawText.split(/(?=Question\s+\d+[:.]?)/i).filter((b) => b.trim().length > 0);

    let counter = 1;

    for (const block of questionBlocks) {
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) continue;

      const firstLine = lines[0];
      // Extract question text from first line or subsequent lines before options
      let qText = firstLine.replace(/^Question\s+\d+[:.]?\s*/i, '').trim();

      const errors: Array<{ field: string; error: string; code: string }> = [];

      // Check if it's MCQ or Descriptive
      const hasOptionA = lines.some((l) => /^[A-Da-d][.)]\s+/.test(l));
      const hasCorrectAnswer = lines.some((l) => /^Correct Answer[:\s]/i.test(l));

      if (hasOptionA || hasCorrectAnswer) {
        // MCQ parsing
        const options: Array<{ label: string; text: string; isCorrect: boolean }> = [];
        let correctAnswer = '';
        let marks = '1.00';
        let negativeMarks = '0.00';
        let topic = '';
        let difficulty = '';

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const optionMatch = line.match(/^([A-D])[.)]\s+(.+)/i);
          if (optionMatch) {
            const label = optionMatch[1].toUpperCase();
            const text = optionMatch[2].trim();
            options.push({ label, text, isCorrect: false });
            continue;
          }

          const correctMatch = line.match(/^Correct Answer[:\s]+([A-D])/i);
          if (correctMatch) {
            correctAnswer = correctMatch[1].toUpperCase();
            continue;
          }

          const marksMatch = line.match(/^Marks[:\s]+([\d.]+)/i);
          if (marksMatch) {
            marks = marksMatch[1];
            continue;
          }

          const negMatch = line.match(/^Negative Marks[:\s]+([\d.]+)/i);
          if (negMatch) {
            negativeMarks = negMatch[1];
            continue;
          }

          const topicMatch = line.match(/^Topic[:\s]+(.+)/i);
          if (topicMatch) {
            topic = topicMatch[1].trim();
            continue;
          }

          const diffMatch = line.match(/^Difficulty[:\s]+(.+)/i);
          if (diffMatch) {
            difficulty = diffMatch[1].trim().toUpperCase();
            continue;
          }

          // If it's none of the above and before options, it might be multiline question text
          if (options.length === 0) {
            qText += `\n${line}`;
          }
        }

        // Apply correct answer flag to options
        if (correctAnswer) {
          const matchedOpt = options.find((o) => o.label === correctAnswer);
          if (matchedOpt) {
            matchedOpt.isCorrect = true;
          } else {
            errors.push({
              field: 'correctAnswer',
              error: `Correct answer '${correctAnswer}' does not match any parsed options`,
              code: 'INVALID_CORRECT_ANSWER',
            });
          }
        } else {
          errors.push({
            field: 'correctAnswer',
            error: 'Correct answer is missing',
            code: 'MISSING_CORRECT_ANSWER',
          });
        }

        if (options.length < 2) {
          errors.push({
            field: 'options',
            error: 'Question must have at least 2 options',
            code: 'INSUFFICIENT_OPTIONS',
          });
        }

        if (!qText) {
          errors.push({
            field: 'questionText',
            error: 'Question text is missing',
            code: 'MISSING_QUESTION_TEXT',
          });
        }

        items.push({
          questionNumber: counter++,
          questionType: QuestionType.MCQ,
          questionText: qText,
          marks: isNaN(parseFloat(marks)) ? '1.00' : marks,
          negativeMarks: isNaN(parseFloat(negativeMarks)) ? '0.00' : negativeMarks,
          options,
          correctAnswer,
          topic: topic || undefined,
          difficulty: difficulty || undefined,
          isValid: errors.length === 0,
          errors,
        });
      } else {
        // Descriptive parsing
        let marks = '10.00';
        let answerInstructions = '';
        let evaluationCriteria = '';
        let expectedAnswer = '';
        let topic = '';
        let difficulty = '';

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const maxMarksMatch = line.match(/^Maximum Marks[:\s]+([\d.]+)/i) || line.match(/^Marks[:\s]+([\d.]+)/i);
          if (maxMarksMatch) {
            marks = maxMarksMatch[1];
            continue;
          }

          const instMatch = line.match(/^Answer Instructions[:\s]+(.+)/i);
          if (instMatch) {
            answerInstructions = instMatch[1].trim();
            continue;
          }

          const evalMatch = line.match(/^Evaluation Criteria[:\s]+(.+)/i);
          if (evalMatch) {
            evaluationCriteria = evalMatch[1].trim();
            continue;
          }

          const expMatch = line.match(/^Expected Answer[:\s]+(.+)/i);
          if (expMatch) {
            expectedAnswer = expMatch[1].trim();
            continue;
          }

          const topicMatch = line.match(/^Topic[:\s]+(.+)/i);
          if (topicMatch) {
            topic = topicMatch[1].trim();
            continue;
          }

          const diffMatch = line.match(/^Difficulty[:\s]+(.+)/i);
          if (diffMatch) {
            difficulty = diffMatch[1].trim().toUpperCase();
            continue;
          }

          // Otherwise multiline question
          if (!answerInstructions && !evaluationCriteria) {
            qText += `\n${line}`;
          }
        }

        if (!qText) {
          errors.push({
            field: 'questionText',
            error: 'Question text is missing',
            code: 'MISSING_QUESTION_TEXT',
          });
        }

        items.push({
          questionNumber: counter++,
          questionType: QuestionType.DESCRIPTIVE,
          questionText: qText,
          marks: isNaN(parseFloat(marks)) ? '10.00' : marks,
          negativeMarks: '0.00',
          answerInstructions: answerInstructions || undefined,
          evaluationCriteria: evaluationCriteria || undefined,
          expectedAnswer: expectedAnswer || undefined,
          topic: topic || undefined,
          difficulty: difficulty || undefined,
          isValid: errors.length === 0,
          errors,
        });
      }
    }

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
