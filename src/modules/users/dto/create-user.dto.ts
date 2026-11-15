import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole, UserStatus } from '../../../shared/enums/index.js';

export class CreateUserDto {
  @ApiProperty({ description: 'Unique username or roll number', example: 'faculty02' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: 'Unique email address', example: 'faculty02@exanova.edu' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Initial password', example: 'Faculty@12345' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.STUDENT })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({ description: 'Whether the user must change password on first login', default: false })
  @IsOptional()
  mustChangePassword?: boolean;
}
