import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service.js';
import { UserStatus } from '../../../shared/enums/index.js';
import type { CurrentUserPayload } from '../../../common/interfaces/api-response.interface.js';

interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtAccessSecret') || 'default_insecure_jwt_access_secret',
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    return {
      sub: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      studentId: user.student?.id,
      facultyId: user.faculty?.id,
      sessionId: payload.sessionId,
    };
  }
}
