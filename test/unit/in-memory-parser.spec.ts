import { describe, it, expect } from 'vitest';
import { ExcelQuestionParser } from '../../src/modules/question-imports/parsers/excel-question.parser.js';
import { TemplateGeneratorService } from '../../src/modules/question-imports/parsers/template-generator.service.js';
import { WordQuestionParser } from '../../src/modules/question-imports/parsers/word-question.parser.js';
import { QuestionType } from '../../src/shared/enums/index.js';

describe('In-Memory Question Parsers', () => {
  const templateService = new TemplateGeneratorService();

  describe('ExcelQuestionParser with In-Memory Buffer', () => {
    it('should generate an in-memory MCQ Excel buffer and parse questions without disk I/O', async () => {
      // 1. Generate template directly into an in-memory Buffer
      const buffer = await templateService.generateMcqTemplate();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);

      // 2. Parse the buffer strictly in memory
      const result = await ExcelQuestionParser.parseBuffer(buffer);

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.valid).toBeGreaterThanOrEqual(1);

      const firstQuestion = result.items[0];
      expect(firstQuestion.questionType).toBe(QuestionType.MCQ);
      expect(firstQuestion.questionText).toContain('asymptotic notation');
      expect(firstQuestion.options).toHaveLength(4);

      // Verify options
      const correctOpt = firstQuestion.options?.find((o) => o.isCorrect);
      expect(correctOpt).toBeDefined();
      expect(correctOpt?.label).toBe('C');
      expect(correctOpt?.text).toBe('Alpha');

      // Verify marks
      expect(parseFloat(firstQuestion.marks)).toBe(2.0);
      expect(parseFloat(firstQuestion.negativeMarks)).toBe(0.5);
    });

    it('should parse in-memory Descriptive Excel template', async () => {
      const buffer = await templateService.generateDescriptiveTemplate();
      expect(Buffer.isBuffer(buffer)).toBe(true);

      const result = await ExcelQuestionParser.parseBuffer(buffer);
      expect(result.total).toBeGreaterThanOrEqual(1);

      const firstQuestion = result.items[0];
      expect(firstQuestion.questionType).toBe(QuestionType.DESCRIPTIVE);
      expect(firstQuestion.questionText).toBeDefined();
      expect(parseFloat(firstQuestion.marks)).toBeGreaterThan(0);
    });

    it('should handle malformed or empty Excel buffer gracefully without throwing unhandled exceptions', async () => {
      const emptyBuffer = Buffer.from('not a real excel file');
      await expect(ExcelQuestionParser.parseBuffer(emptyBuffer)).rejects.toThrow();
    });
  });

  describe('WordQuestionParser with In-Memory Buffer', () => {
    it('should reject non-docx corrupt buffer gracefully', async () => {
      const corruptBuffer = Buffer.from('invalid-word-content');
      await expect(WordQuestionParser.parseBuffer(corruptBuffer)).rejects.toThrow();
    });
  });
});
