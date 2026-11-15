import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveAnswerDto {
  @ApiProperty({ description: 'Selected option UUID (for MCQ)', required: false })
  @IsOptional()
  @IsUUID()
  selectedOptionId?: string;

  @ApiProperty({ example: 'B', description: 'Selected option label', required: false })
  @IsOptional()
  @IsString()
  selectedOptionLabel?: string;

  @ApiProperty({ description: 'Descriptive answer text', required: false })
  @IsOptional()
  @IsString()
  descriptiveAnswer?: string;

  @ApiProperty({ default: false, description: 'Mark question for review', required: false })
  @IsOptional()
  @IsBoolean()
  isMarkedForReview?: boolean;
}

export class BulkAnswersDto {
  @ApiProperty({
    type: [SaveAnswerDto],
    example: [
      {
        questionId: 'uuid-1',
        selectedOptionId: 'opt-uuid-1',
        selectedOptionLabel: 'A',
        isMarkedForReview: false,
      },
    ],
  })
  answers: Array<SaveAnswerDto & { questionId: string }>;
}
