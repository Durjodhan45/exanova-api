import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStudentDto {
  @ApiProperty({ example: '230002' })
  @IsNotEmpty()
  @IsString()
  rollNumber: string;

  @ApiProperty({ example: 'student230002@exanova.edu' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Student@12345' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ example: 'REG-2023-0002', required: false })
  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @ApiProperty({ example: 'Rohan' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Das' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Department UUID' })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @ApiProperty({ description: 'Course UUID' })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({ description: 'Current Semester UUID' })
  @IsNotEmpty()
  @IsUUID()
  currentSemesterId: string;

  @ApiProperty({ description: 'Academic Session UUID' })
  @IsNotEmpty()
  @IsUUID()
  academicSessionId: string;
}

export class UpdateStudentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  currentSemesterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  academicSessionId?: string;
}

export class UpdateStudentProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
