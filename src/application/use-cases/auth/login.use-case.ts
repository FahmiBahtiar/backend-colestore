import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from '../../../domain/repositories';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import { AuthResponseDto, LoginInputDto } from '../../dtos';
import { TokenService } from './token.service';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  /** Authenticate a user with email and password, then issue tokens. */
  async execute(input: LoginInputDto): Promise<AuthResponseDto> {
    const user = await this.userRepository.findByEmail(
      input.email.toLowerCase(),
    );
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.tokenService.createAuthResponse(user);
  }
}
