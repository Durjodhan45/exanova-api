import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email, Username, or Student Roll Number',
    example: 'admin or admin@exanova.edu or 230001',
  })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({
    description: 'Password',
    example: 'Admin@ExaNova2026!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
