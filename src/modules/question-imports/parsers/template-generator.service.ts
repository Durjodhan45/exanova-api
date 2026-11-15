import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { BRANDING } from '../../../common/constants/branding.constants.js';

@Injectable()
export class TemplateGeneratorService {
  async generateMcqTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = BRANDING.appName;
    workbook.lastModifiedBy = BRANDING.developer;

    const worksheet = workbook.addWorksheet('MCQ Questions');
    worksheet.columns = [
      { header: 'Question ID', key: 'id', width: 15 },
      { header: 'Question', key: 'question', width: 45 },
      { header: 'Option A', key: 'optionA', width: 25 },
      { header: 'Option B', key: 'optionB', width: 25 },
      { header: 'Option C', key: 'optionC', width: 25 },
      { header: 'Option D', key: 'optionD', width: 25 },
      { header: 'Correct Answer', key: 'correct', width: 16 },
      { header: 'Marks', key: 'marks', width: 12 },
      { header: 'Negative Marks', key: 'negativeMarks', width: 16 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Topic', key: 'topic', width: 20 },
      { header: 'Difficulty', key: 'difficulty', width: 15 },
    ];

    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF101B3F' }, // ExaNova Midnight Navy
    };

    worksheet.addRow({
      id: 'Q1',
      question: 'Which of the following is NOT an asymptotic notation?',
      optionA: 'Big O',
      optionB: 'Omega',
      optionC: 'Alpha',
      optionD: 'Theta',
      correct: 'C',
      marks: '2.00',
      negativeMarks: '0.50',
      subject: 'Data Structures',
      topic: 'Complexity',
      difficulty: 'EASY',
    });

    worksheet.addRow({
      id: 'Q2',
      question: 'In a max-heap, the parent node key is always:',
      optionA: 'Smaller than child',
      optionB: 'Greater than or equal to child',
      optionC: 'Equal to 0',
      optionD: 'None of the above',
      correct: 'B',
      marks: '2.00',
      negativeMarks: '0.50',
      subject: 'Data Structures',
      topic: 'Heaps',
      difficulty: 'MEDIUM',
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  async generateDescriptiveTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = BRANDING.appName;

    const worksheet = workbook.addWorksheet('Descriptive Questions');
    worksheet.columns = [
      { header: 'Question ID', key: 'id', width: 15 },
      { header: 'Question', key: 'question', width: 45 },
      { header: 'Maximum Marks', key: 'maxMarks', width: 16 },
      { header: 'Answer Instructions', key: 'instructions', width: 35 },
      { header: 'Evaluation Criteria', key: 'criteria', width: 35 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Topic', key: 'topic', width: 20 },
      { header: 'Difficulty', key: 'difficulty', width: 15 },
    ];

    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6246EA' }, // ExaNova Royal Purple
    };

    worksheet.addRow({
      id: 'D1',
      question: 'Explain the working principle of Quick Sort with partition algorithm.',
      maxMarks: '10.00',
      instructions: 'Include pivot selection, partition logic, and best/worst time complexity.',
      criteria: 'Partition logic (4 marks), Pivot explanation (3 marks), Complexity (3 marks)',
      subject: 'Data Structures',
      topic: 'Sorting',
      difficulty: 'MEDIUM',
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  async generateMixedTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = BRANDING.appName;

    // Sheet 1: MCQs
    const mcqSheet = workbook.addWorksheet('MCQ Questions');
    mcqSheet.columns = [
      { header: 'Question ID', key: 'id', width: 15 },
      { header: 'Question', key: 'question', width: 45 },
      { header: 'Option A', key: 'optionA', width: 25 },
      { header: 'Option B', key: 'optionB', width: 25 },
      { header: 'Option C', key: 'optionC', width: 25 },
      { header: 'Option D', key: 'optionD', width: 25 },
      { header: 'Correct Answer', key: 'correct', width: 16 },
      { header: 'Marks', key: 'marks', width: 12 },
      { header: 'Negative Marks', key: 'negativeMarks', width: 16 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Topic', key: 'topic', width: 20 },
      { header: 'Difficulty', key: 'difficulty', width: 15 },
    ];
    const mcqHeader = mcqSheet.getRow(1);
    mcqHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    mcqHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF101B3F' } };

    mcqSheet.addRow({
      id: 'Q1',
      question: 'What is the time complexity of Quick Sort in the worst case?',
      optionA: 'O(n log n)',
      optionB: 'O(n^2)',
      optionC: 'O(log n)',
      optionD: 'O(n)',
      correct: 'B',
      marks: '2.00',
      negativeMarks: '0.50',
      subject: 'Data Structures',
      topic: 'Sorting',
      difficulty: 'MEDIUM',
    });

    // Sheet 2: Descriptive
    const descSheet = workbook.addWorksheet('Descriptive Questions');
    descSheet.columns = [
      { header: 'Question ID', key: 'id', width: 15 },
      { header: 'Question', key: 'question', width: 45 },
      { header: 'Maximum Marks', key: 'maxMarks', width: 16 },
      { header: 'Answer Instructions', key: 'instructions', width: 35 },
      { header: 'Evaluation Criteria', key: 'criteria', width: 35 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Topic', key: 'topic', width: 20 },
      { header: 'Difficulty', key: 'difficulty', width: 15 },
    ];
    const descHeader = descSheet.getRow(1);
    descHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    descHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6246EA' } };

    descSheet.addRow({
      id: 'D1',
      question: 'Explain AVL tree rotation techniques with diagrams.',
      maxMarks: '10.00',
      instructions: 'Explain LL, RR, LR, and RL rotations with balance factor criteria.',
      criteria: 'Rotations explanation (6 marks), Balance factor formula (4 marks)',
      subject: 'Data Structures',
      topic: 'Balanced Trees',
      difficulty: 'HARD',
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }
}
