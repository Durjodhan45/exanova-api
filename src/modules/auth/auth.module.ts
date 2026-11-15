import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { PasswordResetToken } from './entities/password-reset-token.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('auth.jwtAccessSecret') || 'default_insecure_jwt_access_secret',
        signOptions: {
          expiresIn: (configService.get<string>('auth.jwtAccessExpiresIn') || '15m') as `${number}m`,
        },
      }),
    }),
    TypeOrmModule.forFeature([RefreshToken, PasswordResetToken, Student]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
