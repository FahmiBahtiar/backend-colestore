import { UserEntity } from '../../domain/repositories';
import { UserResponseDto } from '../dtos';

export class UserMapper {
  /** Map persisted user data to a safe application response DTO. */
  static toResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
