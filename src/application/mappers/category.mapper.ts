import { CategoryEntity } from '../../domain/repositories';
import { CategoryResponseDto } from '../dtos';

export class CategoryMapper {
  /** Map persisted category data to an application response DTO. */
  static toResponse(
    category: CategoryEntity,
    imageUrl?: string | null,
  ): CategoryResponseDto {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      imageKey: category.imageKey ?? null,
      imageUrl: imageUrl ?? null,
    };
  }
}
