import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from '../../../domain/repositories';
import { USER_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListUsersInputDto, UserResponseDto } from '../../dtos';
import { UserMapper } from '../../mappers';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  /** List users with pagination for admin management. */
  async execute(input: ListUsersInputDto = {}): Promise<{
    items: UserResponseDto[];
    total: number;
  }> {
    const result = await this.userRepository.findAll(input);
    return {
      items: result.items.map((user) => UserMapper.toResponse(user)),
      total: result.meta.total,
    };
  }
}
