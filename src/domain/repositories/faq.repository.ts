import { IBaseRepository } from './base.repository';
import { PaginatedResult } from '../../common/utils/pagination';

export interface FaqEntity {
  id: string;
  question: string;
  answer: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FAQ repository interface — domain layer contract.
 */
export interface IFaqRepository extends IBaseRepository<FaqEntity> {
  findAll(params?: {
    skip?: number;
    take?: number;
    isActive?: boolean;
    search?: string;
  }): Promise<PaginatedResult<FaqEntity>>;
}
