import { CategoryEntity } from '../../domain/repositories';
import { CategoryResponseDto } from '../dtos';

export class CategoryMapper {
  /** Map persisted category data to an application response DTO. */
  static toResponse(category: CategoryEntity): CategoryResponseDto {
    return { ...category };
  }
}
