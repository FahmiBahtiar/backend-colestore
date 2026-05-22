import { IBaseRepository } from './base.repository';

export interface ProductEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  isActive: boolean;
  hasVariants: boolean;
  stockQuantity: number | null;
  digitalFileKey: string | null;
  categoryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product repository interface — domain layer contract.
 */
export interface IProductRepository extends IBaseRepository<ProductEntity> {
  findBySlug(slug: string): Promise<ProductEntity | null>;
  findActiveProducts(params?: {
    skip?: number;
    take?: number;
    categoryId?: string;
  }): Promise<{ items: ProductEntity[]; total: number }>;
}
