import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSemesterDto {
  @ApiProperty({ description: 'Course UUID' })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  semesterNumber: number;

  @ApiProperty({ example: 'Semester 1' })
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateSemesterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  semesterNumber?: number;
}
