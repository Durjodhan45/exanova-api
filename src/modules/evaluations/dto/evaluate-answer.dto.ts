import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class EvaluateAnswerDto {
  @ApiProperty({ example: '8.50', description: 'Marks awarded (must not exceed maximum marks)' })
  @IsNotEmpty()
  @IsNumberString()
  marksAwarded: string;

  @ApiProperty({ example: 'Good understanding of core concepts, examples could be improved.', required: false })
  @IsOptional()
  @IsString()
  generalFeedback?: string;

  @ApiProperty({
    example: [
      { criterion: 'Conceptual clarity', maxMarks: 4, awardedMarks: 3.5, comment: 'Clear explanation' },
      { criterion: 'Examples', maxMarks: 3, awardedMarks: 2.0 },
      { criterion: 'Complexity analysis', maxMarks: 3, awardedMarks: 3.0 },
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  criteriaScores?: Array<{ criterion: string; maxMarks: number; awardedMarks: number; comment?: string }>;
}
