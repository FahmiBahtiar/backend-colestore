import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';

@Injectable()
export class DeactivateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /** Soft-delete a user by marking the account inactive. */
  async execute(id: string): Promise<void> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.update(id, { isActive: false });
  }
}
