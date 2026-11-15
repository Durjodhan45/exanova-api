import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Result } from '../entities/result.entity.js';
import { BRANDING } from '../../../common/constants/branding.constants.js';

@Injectable()
export class PdfScorecardService {
  /**
   * Generates official ExaNova examination scorecard PDF in memory buffer.
   * Never saved to disk.
   */
  async generateScorecardBuffer(result: Result): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Primary colors
      const midnightNavy = BRANDING.colors.midnightNavy;
      const royalPurple = BRANDING.colors.royalPurple;
      const gold = BRANDING.colors.gold;
      const slateGray = BRANDING.colors.slateGray;
      const isPass = result.passFailStatus === 'PASS';
      const statusColor = isPass ? BRANDING.colors.successGreen : BRANDING.colors.errorRed;

      // 1. Top Decorative Header Banner
      doc.rect(0, 0, doc.page.width, 110).fill(midnightNavy);

      doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold');
      doc.text(BRANDING.appName, 40, 30);

      doc.fillColor(gold).fontSize(10).font('Helvetica');
      doc.text(BRANDING.tagline, 40, 60);

      doc.fillColor('#F5F6FA').fontSize(9).font('Helvetica');
      doc.text(`${BRANDING.organization} | Autonomous Institution`, 40, 75);
      doc.text(BRANDING.address, 40, 88);

      // 2. Scorecard Title Badge
      doc.rect(40, 125, doc.page.width - 80, 35).fill(royalPurple);
      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold');
      doc.text('OFFICIAL EXAMINATION SCORECARD & PERFORMANCE TRANSCRIPT', 40, 137, {
        align: 'center',
      });

      // 3. Student & Examination Information Box
      const student = result.student;
      const exam = result.examination;

      doc.rect(40, 175, doc.page.width - 80, 100).lineWidth(1).strokeColor(slateGray).stroke();

      doc.fillColor(midnightNavy).fontSize(10).font('Helvetica-Bold');
      doc.text('CANDIDATE INFORMATION', 50, 185);
      doc.text('EXAMINATION DETAILS', 320, 185);

      doc.fillColor('#222222').fontSize(9).font('Helvetica');
      doc.text(`Student Name: ${student?.firstName || ''} ${student?.lastName || ''}`, 50, 205);
      doc.text(`Roll Number: ${student?.rollNumber || 'N/A'}`, 50, 220);
      doc.text(`Registration: ${student?.registrationNumber || 'N/A'}`, 50, 235);
      doc.text(`Department: ${student?.department?.code || student?.department?.name || 'N/A'}`, 50, 250);

      doc.text(`Title: ${exam?.title || 'N/A'}`, 320, 205, { width: 230 });
      doc.text(`Exam Code: ${exam?.examinationCode || 'N/A'}`, 320, 225);
      doc.text(`Subject: ${exam?.subject?.name || 'N/A'}`, 320, 240, { width: 230 });
      doc.text(`Date: ${result.calculatedAt ? new Date(result.calculatedAt).toLocaleDateString() : 'N/A'}`, 320, 255);

      // 4. Performance Metrics Table
      const tableTop = 295;
      doc.rect(40, tableTop, doc.page.width - 80, 25).fill(midnightNavy);
      doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
      doc.text('Assessment Metric', 55, tableTop + 7);
      doc.text('Score / Value', doc.page.width - 150, tableTop + 7, { align: 'right' });

      const metrics = [
        ['Total Questions In Paper', `${result.totalQuestions}`],
        ['Correct Answers (MCQ)', `${result.correctAnswers}`],
        ['Incorrect Answers (MCQ)', `${result.incorrectAnswers}`],
        ['Unanswered Questions', `${result.unansweredCount}`],
        ['Gross MCQ Marks Awarded', `+${result.mcqMarksAwarded}`],
        ['Negative Marks Deducted', `-${result.negativeMarksDeducted}`],
        ['Net MCQ Score', `${result.netMcqScore}`],
        ['Descriptive Evaluation Score', `+${result.descriptiveScore}`],
        ['Final Consolidated Marks', `${result.finalMarks} / ${result.maximumMarks}`],
        ['Overall Percentage', `${result.percentage}%`],
        ['Assigned Letter Grade', `${result.grade}`],
        ['Rank In Examination', result.rank ? `#${result.rank}` : 'N/A'],
      ];

      let rowY = tableTop + 25;
      metrics.forEach(([label, value], idx) => {
        const bg = idx % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
        doc.rect(40, rowY, doc.page.width - 80, 20).fill(bg);
        doc.fillColor('#333333').fontSize(9).font('Helvetica');
        doc.text(label, 55, rowY + 5);
        doc.font('Helvetica-Bold').text(value, doc.page.width - 150, rowY + 5, { align: 'right' });
        rowY += 20;
      });

      // 5. Result Status Callout Box
      doc.rect(40, rowY + 15, doc.page.width - 80, 45).fill(statusColor);
      doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold');
      doc.text(
        `FINAL RESULT: ${result.passFailStatus} (${result.percentage}%)`,
        40,
        rowY + 28,
        { align: 'center' },
      );

      // 6. Security & Verification Footer
      const footerY = 690;
      doc.rect(40, footerY, doc.page.width - 80, 1).fill(slateGray);

      doc.fillColor(slateGray).fontSize(8).font('Helvetica');
      doc.text(
        `System Generated Document by ${BRANDING.appName} Examination Engine | Developer: ${BRANDING.developer}`,
        40,
        footerY + 10,
        { align: 'center' },
      );
      doc.text(
        `Result ID: ${result.id} | Verification Hash: sha256-${Buffer.from(result.id).toString('hex').substring(0, 16)}`,
        40,
        footerY + 22,
        { align: 'center' },
      );
      doc.text(
        `Issued by: Controller of Examinations, ${BRANDING.organization}`,
        40,
        footerY + 34,
        { align: 'center' },
      );

      doc.end();
    });
  }
}
