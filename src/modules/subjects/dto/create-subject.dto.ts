import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({ description: 'Course UUID' })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ description: 'Semester UUID' })
  @IsNotEmpty()
  @IsUUID()
  semesterId: string;

  @ApiProperty({ example: 'Data Structures and Algorithms' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'CS301' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 4, default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number = 3;

  @ApiProperty({ example: 'Core computer science course', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSubjectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  semesterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  credits?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
