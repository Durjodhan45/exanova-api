import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ExaminationType, NegativeMarkingType } from '../../../shared/enums/index.js';

export class CreateExaminationDto {
  @ApiProperty({ example: 'Data Structures Midterm Assessment 2026' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'DSA-MIDTERM-2026' })
  @IsNotEmpty()
  @IsString()
  examinationCode: string;

  @ApiProperty({ example: 'Covers trees, graphs, sorting', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Department UUID' })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @ApiProperty({ description: 'Course UUID' })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ description: 'Semester UUID' })
  @IsNotEmpty()
  @IsUUID()
  semesterId: string;

  @ApiProperty({ description: 'Subject UUID' })
  @IsNotEmpty()
  @IsUUID()
  subjectId: string;

  @ApiProperty({ description: 'Academic Session UUID' })
  @IsNotEmpty()
  @IsUUID()
  academicSessionId: string;

  @ApiProperty({ enum: ExaminationType, default: ExaminationType.MCQ })
  @IsEnum(ExaminationType)
  examinationType: ExaminationType;

  @ApiProperty({ example: '2026-11-08T10:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-11-08T12:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 60, description: 'Duration in minutes' })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ example: '100.00', default: '100.00' })
  @IsNotEmpty()
  @IsNumberString()
  totalMarks: string;

  @ApiProperty({ example: '40.00', default: '40.00' })
  @IsNotEmpty()
  @IsNumberString()
  passingMarks: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number = 1;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean = false;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean = false;

  @ApiProperty({ enum: NegativeMarkingType, default: NegativeMarkingType.NONE })
  @IsEnum(NegativeMarkingType)
  negativeMarkingType: NegativeMarkingType;

  @ApiProperty({ example: '0.25', default: '0' })
  @IsOptional()
  @IsNumberString()
  negativeMarkingValue?: string = '0';

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  allowNegativeMarksBelowZero?: boolean = false;

  @ApiProperty({ example: 'Do not refresh page during examination', required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class UpdateExaminationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  examinationCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  totalMarks?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  passingMarks?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maxAttempts?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;

  @ApiProperty({ enum: NegativeMarkingType, required: false })
  @IsOptional()
  @IsEnum(NegativeMarkingType)
  negativeMarkingType?: NegativeMarkingType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  negativeMarkingValue?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  allowNegativeMarksBelowZero?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class AddEligibleStudentsDto {
  @ApiProperty({ description: 'Array of student UUIDs', type: [String] })
  @IsNotEmpty()
  studentIds: string[];
}

export class AssignFacultyDto {
  @ApiProperty({ description: 'Faculty UUID' })
  @IsNotEmpty()
  @IsUUID()
  facultyId: string;

  @ApiProperty({ example: 'EVALUATOR', default: 'EVALUATOR' })
  @IsOptional()
  @IsString()
  role?: string = 'EVALUATOR';
}
