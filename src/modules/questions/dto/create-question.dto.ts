import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DifficultyLevel, QuestionType } from '../../../shared/enums/index.js';

export class CreateOptionDto {
  @ApiProperty({ example: 'A', description: 'Label (A, B, C, D)' })
  @IsNotEmpty()
  @IsString()
  optionLabel: string;

  @ApiProperty({ example: 'Operating System' })
  @IsNotEmpty()
  @IsString()
  optionText: string;

  @ApiProperty({ default: false })
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  optionOrder?: number = 1;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Authoritative Test UUID' })
  @IsNotEmpty()
  @IsUUID()
  testId: string;

  @ApiProperty({ example: 'What is the primary function of an operating system kernel?' })
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @ApiProperty({ enum: QuestionType, default: QuestionType.MCQ })
  @IsEnum(QuestionType)
  questionType: QuestionType;

  @ApiProperty({ example: '2.00', default: '1.00' })
  @IsNotEmpty()
  @IsNumberString()
  marks: string;

  @ApiProperty({ example: '0.25', default: '0.00' })
  @IsOptional()
  @IsNumberString()
  negativeMarks?: string = '0.00';

  @ApiProperty({ example: 'Operating Systems', required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ enum: DifficultyLevel, required: false })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  questionOrder?: number = 1;

  // MCQ Options
  @ApiProperty({ type: [CreateOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];

  // Descriptive Fields
  @ApiProperty({ example: 'Write concise explanation with 3 points', required: false })
  @IsOptional()
  @IsString()
  answerInstructions?: string;

  @ApiProperty({ example: 'Core concept: 2 marks, Example: 1 mark', required: false })
  @IsOptional()
  @IsString()
  evaluationCriteria?: string;

  @ApiProperty({ example: 'Resource management and hardware abstraction', required: false })
  @IsOptional()
  @IsString()
  expectedAnswer?: string;
}

export class UpdateQuestionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  questionText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  marks?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  negativeMarks?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ enum: DifficultyLevel, required: false })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  questionOrder?: number;

  @ApiProperty({ type: [CreateOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  answerInstructions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  evaluationCriteria?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  expectedAnswer?: string;
}

export class BulkQuestionsDto {
  @ApiProperty({ description: 'Authoritative Test UUID' })
  @IsNotEmpty()
  @IsUUID()
  testId: string;

  @ApiProperty({ type: [CreateQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class ReorderQuestionsDto {
  @ApiProperty({ description: 'Authoritative Test UUID' })
  @IsNotEmpty()
  @IsUUID()
  testId: string;

  @ApiProperty({
    example: [
      { questionId: 'uuid-1', order: 1 },
      { questionId: 'uuid-2', order: 2 },
    ],
  })
  @IsArray()
  orders: Array<{ questionId: string; order: number }>;
}
