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
  imageKey: string | null;
  categoryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  variants?: {
    id: string;
    name: string;
    price: number | null;
    stockQuantity: number | null;
    productId: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  checkoutFields?: {
    id: string;
    productId: string;
    label: string;
    type: string;
    isRequired: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }[];
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
    search?: string;
    includeInactive?: boolean;
  }): Promise<{ items: ProductEntity[]; total: number }>;
}
