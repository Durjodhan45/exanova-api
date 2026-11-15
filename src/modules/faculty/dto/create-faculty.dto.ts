import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateFacultyDto {
  @ApiProperty({ example: 'faculty02' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'faculty02@exanova.edu' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Faculty@12345' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty({ example: 'FAC-002' })
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @ApiProperty({ example: 'Priya' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Mukherjee' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Assistant Professor', default: 'Assistant Professor' })
  @IsOptional()
  @IsString()
  designation?: string = 'Assistant Professor';

  @ApiProperty({ example: '+919830123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Department UUID' })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;
}

export class UpdateFacultyDto {
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
  designation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}

export class AssignSubjectDto {
  @ApiProperty({ description: 'Faculty UUID' })
  @IsNotEmpty()
  @IsUUID()
  facultyId: string;

  @ApiProperty({ description: 'Subject UUID' })
  @IsNotEmpty()
  @IsUUID()
  subjectId: string;

  @ApiProperty({ description: 'Academic Session UUID' })
  @IsNotEmpty()
  @IsUUID()
  academicSessionId: string;
}
