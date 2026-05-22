import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { UserEntity } from '../../../domain/repositories';
import { AuthResponseDto } from '../../dtos';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Build a sanitized auth response and signed token pair. */
  createAuthResponse(user: UserEntity): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
    };
  }

  private signAccessToken(user: UserEntity): string {
    return this.jwtService.sign(this.buildPayload(user), {
      secret: this.configService.getOrThrow<string>('jwt.secret'),
      expiresIn: this.configService.get<string>(
        'jwt.accessExpiration',
        '15m',
      ) as JwtSignOptions['expiresIn'],
    });
  }

  private signRefreshToken(user: UserEntity): string {
    return this.jwtService.sign(this.buildPayload(user), {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>(
        'jwt.refreshExpiration',
        '7d',
      ) as JwtSignOptions['expiresIn'],
    });
  }

  private buildPayload(user: UserEntity): {
    sub: string;
    email: string;
    role: UserEntity['role'];
  } {
    return { sub: user.id, email: user.email, role: user.role };
  }
}
