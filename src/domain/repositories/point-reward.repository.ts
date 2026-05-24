import { IBaseRepository } from './base.repository';

export interface PointRewardEntity {
  id: string;
  name: string;
  description: string | null;
  pointCost: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxRedemptions: number | null;
  redeemedCount: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Point reward repository — domain layer contract.
 */
export interface IPointRewardRepository extends IBaseRepository<PointRewardEntity> {
  findActive(): Promise<PointRewardEntity[]>;
  incrementRedeemedCount(id: string): Promise<void>;
}
