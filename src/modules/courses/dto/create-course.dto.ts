import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ description: 'Department UUID' })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @ApiProperty({ example: 'Bachelor of Technology in Computer Science & Engineering' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'BTECH-CSE' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 4, default: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  durationYears?: number = 4;

  @ApiProperty({ example: 8, default: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  totalSemesters?: number = 8;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourseDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

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
  durationYears?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  totalSemesters?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
