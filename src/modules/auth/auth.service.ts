import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { PasswordResetToken } from './entities/password-reset-token.entity.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { AuditAction, UserRole, UserStatus } from '../../shared/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { Student } from '../students/entities/student.entity.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepo: Repository<PasswordResetToken>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    let user = await this.usersService.findByIdentifier(dto.identifier);

    // If not found, check if identifier is a student's roll number
    if (!user) {
      const student = await this.studentRepo.findOne({
        where: { rollNumber: dto.identifier },
        relations: { user: true, department: true, course: true, currentSemester: true },
      });
      if (student && student.user) {
        user = await this.usersService.findById(student.userId);
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}. Please contact administration.`);
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const refreshExpiresDays = 7;
    const expiresAt = new Date(Date.now() + refreshExpiresDays * 24 * 60 * 60 * 1000);

    const refreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
      isRevoked: false,
    });
    const savedToken = await this.refreshTokenRepo.save(refreshTokenEntity);

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      sessionId: savedToken.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwtAccessSecret'),
      expiresIn: (this.configService.get<string>('auth.jwtAccessExpiresIn') || '15m') as `${number}m`,
    });

    await this.auditLogsService.log({
      action: AuditAction.AUTH_LOGIN,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      ipAddress,
      userAgent,
      details: { role: user.role, username: user.username },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiresIn') || '15m',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        student: user.student
          ? {
              id: user.student.id,
              rollNumber: user.student.rollNumber,
              firstName: user.student.firstName,
              lastName: user.student.lastName,
            }
          : undefined,
        faculty: user.faculty
          ? {
              id: user.faculty.id,
              employeeId: user.faculty.employeeId,
              firstName: user.faculty.firstName,
              lastName: user.faculty.lastName,
            }
          : undefined,
      },
    };
  }

  async refreshToken(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!rawRefreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const existingToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (existingToken.isRevoked) {
      // Possible token theft! Revoke all tokens for this user
      await this.refreshTokenRepo.update({ userId: existingToken.userId }, { isRevoked: true });
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = existingToken.user;
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
    }

    // Refresh Token Rotation: Revoke the used token
    existingToken.isRevoked = true;
    await this.refreshTokenRepo.save(existingToken);

    // Issue new pair
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const refreshExpiresDays = 7;
    const expiresAt = new Date(Date.now() + refreshExpiresDays * 24 * 60 * 60 * 1000);

    const newRefreshTokenEntity = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt,
      ipAddress,
      userAgent,
      isRevoked: false,
    });
    const savedNewToken = await this.refreshTokenRepo.save(newRefreshTokenEntity);

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      sessionId: savedNewToken.id,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('auth.jwtAccessSecret'),
      expiresIn: (this.configService.get<string>('auth.jwtAccessExpiresIn') || '15m') as `${number}m`,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiresIn') || '15m',
    };
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.refreshTokenRepo.update({ id: sessionId, userId }, { isRevoked: true });
    }
    await this.auditLogsService.log({
      action: AuditAction.AUTH_LOGOUT,
      entityType: 'User',
      entityId: userId,
      userId,
    });
    return { success: true, message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.refreshTokenRepo.update({ userId }, { isRevoked: true });
    await this.auditLogsService.log({
      action: AuditAction.AUTH_LOGOUT,
      entityType: 'User',
      entityId: userId,
      userId,
      details: { allSessions: true },
    });
    return { success: true, message: 'All sessions revoked successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findById(userId);

    const isMatch = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isMatch) {
      throw new BadRequestException('Current password does not match');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    user.passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
      timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
      parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
    });
    user.mustChangePassword = false;

    await this.studentRepo.manager.save(user);

    // Revoke all existing sessions so user logs in with new password
    await this.refreshTokenRepo.update({ userId }, { isRevoked: true });

    await this.auditLogsService.log({
      action: AuditAction.PASSWORD_CHANGE,
      entityType: 'User',
      entityId: userId,
      userId,
    });

    return { success: true, message: 'Password changed successfully. Please log in again.' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByIdentifier(email);
    if (!user) {
      return { success: true, message: 'If an account exists with this email, a reset token has been issued.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.passwordResetTokenRepo.save(
      this.passwordResetTokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        isUsed: false,
      }),
    );

    await this.auditLogsService.log({
      action: AuditAction.PASSWORD_RESET_REQUEST,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
    });

    return {
      success: true,
      message: 'Password reset token generated. In a production environment with email configured, this is sent to email.',
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const resetRecord = await this.passwordResetTokenRepo.findOne({
      where: { tokenHash, isUsed: false },
      relations: { user: true },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const user = resetRecord.user;
    user.passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
      timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
      parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
    });
    user.mustChangePassword = false;
    await this.studentRepo.manager.save(user);

    resetRecord.isUsed = true;
    await this.passwordResetTokenRepo.save(resetRecord);

    await this.refreshTokenRepo.update({ userId: user.id }, { isRevoked: true });

    await this.auditLogsService.log({
      action: AuditAction.PASSWORD_RESET_COMPLETE,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
    });

    return { success: true, message: 'Password has been reset successfully' };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async getSessions(userId: string) {
    const sessions = await this.refreshTokenRepo.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });

    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.refreshTokenRepo.findOne({
      where: { id: sessionId, userId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    session.isRevoked = true;
    await this.refreshTokenRepo.save(session);
    return { success: true, message: 'Session revoked successfully' };
  }
}
