import { IBaseRepository } from './base.repository';

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  imageKey?: string | null;
}

/**
 * Category repository interface — domain layer contract.
 */
export interface ICategoryRepository extends IBaseRepository<CategoryEntity> {
  findBySlug(slug: string): Promise<CategoryEntity | null>;
}
