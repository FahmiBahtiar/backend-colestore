import { IBaseRepository } from './base.repository';
import { PaginatedResult } from '../../common/utils/pagination';

export interface BannerEntity {
  id: string;
  title: string | null;
  subtitle: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  imageKey: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Banner repository interface — domain layer contract.
 */
export interface IBannerRepository extends IBaseRepository<BannerEntity> {
  findAll(params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
  }): Promise<PaginatedResult<BannerEntity>>;
}
