import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../../../domain/entities';
import { IUserRepository, UserEntity } from '../../../domain/repositories';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import { AuthResponseDto, RegisterUserInputDto } from '../../dtos';
import { TokenService } from './token.service';

@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  /** Register a buyer account and issue access and refresh tokens. */
  async execute(input: RegisterUserInputDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const now = new Date();
    const user = User.create({
      id: 'new-user',
      email: input.email.toLowerCase(),
      password: passwordHash,
      name: input.name ?? null,
      role: 'BUYER',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.userRepository.create(
      this.toCreateData(user.toPrimitives()),
    );

    return this.tokenService.createAuthResponse(created);
  }

  private toCreateData(
    user: UserEntity,
  ): Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
