import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IUserRepository } from '../../domain/repositories';
import { USER_REPOSITORY } from '../../domain/repositories/tokens';
import { AuthenticatedUser, JwtPayload } from '../auth/authenticated-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    const jwtSecret = configService.get<string>(
      'jwt.secret',
      'change-me-in-production',
    );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /** Validate JWT payload and return the sanitized authenticated user. */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or inactive user');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
