import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumberString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../../../shared/enums/index.js';
import { CreateOptionDto } from '../../questions/dto/create-question.dto.js';

export class UpdateStagedQuestionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  questionText?: string;

  @ApiProperty({ enum: QuestionType, required: false })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  marks?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumberString()
  negativeMarks?: string;

  @ApiProperty({ type: [CreateOptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  correctAnswer?: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  difficulty?: string;
}
