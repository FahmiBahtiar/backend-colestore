import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import { UpdateUserInputDto, UserResponseDto } from '../../dtos';
import { UserMapper } from '../../mappers';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /** Update admin-managed user profile, role, or active status. */
  async execute(input: UpdateUserInputDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.userRepository.update(input.id, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
    return UserMapper.toResponse(updated);
  }
}
