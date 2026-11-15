import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Result } from '../results/entities/result.entity.js';
import { Examination } from '../examinations/entities/examination.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Faculty } from '../faculty/entities/faculty.entity.js';
import { ExamAttempt } from '../exam-attempts/entities/exam-attempt.entity.js';
import { BRANDING } from '../../common/constants/branding.constants.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Result)
    private readonly resultRepo: Repository<Result>,
    @InjectRepository(Examination)
    private readonly examRepo: Repository<Examination>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Faculty)
    private readonly facultyRepo: Repository<Faculty>,
    @InjectRepository(ExamAttempt)
    private readonly attemptRepo: Repository<ExamAttempt>,
  ) {}

  async getStudentsReport(query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.studentRepo.findAndCount({
      relations: { department: true, course: true, currentSemester: true },
      skip,
      take: limit,
      order: { rollNumber: 'ASC' },
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getFacultyReport(query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.facultyRepo.findAndCount({
      relations: { department: true, subjectAssignments: { subject: true } },
      skip,
      take: limit,
      order: { firstName: 'ASC' },
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getExaminationsReport(query: PaginationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.examRepo.findAndCount({
      relations: { department: true, course: true, subject: true, createdByFaculty: true },
      skip,
      take: limit,
      order: { startDate: 'DESC' },
    });

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getResultsReport(query: PaginationQueryDto & { testId?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.resultRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.examination', 'exam')
      .leftJoinAndSelect('res.student', 'student')
      .orderBy('res.finalMarks', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.testId) {
      qb.andWhere('res.testId = :testId', { testId: query.testId });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getExamPerformance(testId: string) {
    const exam = await this.examRepo.findOne({
      where: { id: testId },
      relations: { subject: true },
    });
    if (!exam) throw new NotFoundException('Examination not found');

    const results = await this.resultRepo.find({ where: { testId } });
    const total = results.length;
    if (total === 0) {
      return {
        testId,
        title: exam.title,
        message: 'No completed evaluations found for this examination',
      };
    }

    const scores = results.map((r) => parseFloat(r.finalMarks));
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = Math.round((sum / total) * 100) / 100;

    const passed = results.filter((r) => r.passFailStatus === 'PASS').length;
    const passPercentage = `${Math.round((passed / total) * 100)}%`;

    return {
      testId,
      title: exam.title,
      code: exam.examinationCode,
      totalCandidates: total,
      highestScore: highest,
      lowestScore: lowest,
      averageScore: average,
      passedCount: passed,
      failedCount: total - passed,
      passPercentage,
    };
  }

  async getExamSubmissions(testId: string) {
    return await this.attemptRepo.find({
      where: { testId },
      relations: { student: true, result: true },
      order: { startedAt: 'DESC' },
    });
  }

  async getSubjectResults(subjectId: string) {
    return await this.resultRepo
      .createQueryBuilder('res')
      .innerJoinAndSelect('res.examination', 'exam')
      .innerJoinAndSelect('res.student', 'student')
      .where('exam.subjectId = :subjectId', { subjectId })
      .orderBy('res.finalMarks', 'DESC')
      .getMany();
  }

  async getSemesterResults(semesterId: string) {
    return await this.resultRepo
      .createQueryBuilder('res')
      .innerJoinAndSelect('res.examination', 'exam')
      .innerJoinAndSelect('res.student', 'student')
      .where('exam.semesterId = :semesterId', { semesterId })
      .orderBy('res.finalMarks', 'DESC')
      .getMany();
  }

  /**
   * Generates consolidated Excel report in memory buffer.
   * File is never saved to disk.
   */
  async exportResultsExcel(testId?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = BRANDING.appName;
    workbook.lastModifiedBy = BRANDING.developer;

    const worksheet = workbook.addWorksheet('Consolidated Results');
    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 10 },
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Roll Number', key: 'rollNumber', width: 18 },
      { header: 'Examination Title', key: 'examTitle', width: 35 },
      { header: 'Exam Code', key: 'examCode', width: 18 },
      { header: 'MCQ Marks', key: 'mcqMarks', width: 15 },
      { header: 'Negative Deduction', key: 'negativeMarks', width: 20 },
      { header: 'Descriptive Marks', key: 'descMarks', width: 18 },
      { header: 'Final Marks', key: 'finalMarks', width: 15 },
      { header: 'Max Marks', key: 'maxMarks', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 15 },
      { header: 'Grade', key: 'grade', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    const header = worksheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF101B3F' }, // ExaNova Midnight Navy
    };

    const qb = this.resultRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.examination', 'exam')
      .leftJoinAndSelect('res.student', 'student')
      .orderBy('res.finalMarks', 'DESC');

    if (testId) {
      qb.andWhere('res.testId = :testId', { testId });
    }

    const results = await qb.getMany();

    results.forEach((r, idx) => {
      worksheet.addRow({
        rank: r.rank || idx + 1,
        studentName: `${r.student?.firstName || ''} ${r.student?.lastName || ''}`,
        rollNumber: r.student?.rollNumber || 'N/A',
        examTitle: r.examination?.title || 'N/A',
        examCode: r.examination?.examinationCode || 'N/A',
        mcqMarks: r.mcqMarksAwarded,
        negativeMarks: `-${r.negativeMarksDeducted}`,
        descMarks: r.descriptiveScore,
        finalMarks: r.finalMarks,
        maxMarks: r.maximumMarks,
        percentage: `${r.percentage}%`,
        grade: r.grade,
        status: r.passFailStatus,
      });
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  /**
   * Generates consolidated PDF report in memory buffer.
   * File is never saved to disk.
   */
  async exportResultsPdf(testId?: string): Promise<Buffer> {
    const qb = this.resultRepo
      .createQueryBuilder('res')
      .leftJoinAndSelect('res.examination', 'exam')
      .leftJoinAndSelect('res.student', 'student')
      .orderBy('res.finalMarks', 'DESC');

    if (testId) {
      qb.andWhere('res.testId = :testId', { testId });
    }

    const results = await qb.getMany();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.rect(0, 0, doc.page.width, 70).fill(BRANDING.colors.midnightNavy);
      doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold');
      doc.text(`${BRANDING.appName} - Consolidated Examination Results Report`, 40, 20);
      doc.fillColor(BRANDING.colors.gold).fontSize(10).font('Helvetica');
      doc.text(`${BRANDING.organization} | Generated on: ${new Date().toLocaleString()}`, 40, 48);

      // Table Header
      const tableTop = 90;
      doc.rect(40, tableTop, doc.page.width - 80, 22).fill(BRANDING.colors.royalPurple);
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('Rank', 45, tableTop + 6);
      doc.text('Student Name', 85, tableTop + 6);
      doc.text('Roll No', 210, tableTop + 6);
      doc.text('Exam Code', 300, tableTop + 6);
      doc.text('MCQ Score', 410, tableTop + 6);
      doc.text('Desc Score', 490, tableTop + 6);
      doc.text('Final Marks', 570, tableTop + 6);
      doc.text('%', 660, tableTop + 6);
      doc.text('Grade', 700, tableTop + 6);
      doc.text('Status', 745, tableTop + 6);

      let rowY = tableTop + 22;
      results.forEach((r, idx) => {
        if (rowY > doc.page.height - 50) {
          doc.addPage({ layout: 'landscape', margin: 40 });
          rowY = 40;
        }

        const bg = idx % 2 === 0 ? '#F9F9F9' : '#FFFFFF';
        doc.rect(40, rowY, doc.page.width - 80, 18).fill(bg);
        doc.fillColor('#222222').fontSize(8).font('Helvetica');
        doc.text(`${r.rank || idx + 1}`, 45, rowY + 5);
        doc.text(`${r.student?.firstName || ''} ${r.student?.lastName || ''}`, 85, rowY + 5, { width: 120 });
        doc.text(`${r.student?.rollNumber || 'N/A'}`, 210, rowY + 5);
        doc.text(`${r.examination?.examinationCode || 'N/A'}`, 300, rowY + 5);
        doc.text(`${r.netMcqScore}`, 410, rowY + 5);
        doc.text(`${r.descriptiveScore}`, 490, rowY + 5);
        doc.font('Helvetica-Bold').text(`${r.finalMarks}/${r.maximumMarks}`, 570, rowY + 5);
        doc.font('Helvetica').text(`${r.percentage}%`, 660, rowY + 5);
        doc.text(`${r.grade}`, 700, rowY + 5);

        const statusColor = r.passFailStatus === 'PASS' ? BRANDING.colors.successGreen : BRANDING.colors.errorRed;
        doc.fillColor(statusColor).font('Helvetica-Bold').text(`${r.passFailStatus}`, 745, rowY + 5);

        rowY += 18;
      });

      doc.end();
    });
  }
}
