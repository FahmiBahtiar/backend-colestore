import { IBaseRepository } from './base.repository';

export interface CouponEntity {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Coupon repository interface — domain layer contract.
 */
export interface ICouponRepository extends IBaseRepository<CouponEntity> {
  findByCode(code: string): Promise<CouponEntity | null>;
  incrementUsedCount(id: string): Promise<void>;
}
