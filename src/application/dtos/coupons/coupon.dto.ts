import { DiscountType } from '../../../domain/entities';

export interface CouponResponseDto {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCouponInputDto {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
}

export interface ValidateCouponInputDto {
  code: string;
  orderAmount: number;
  userId?: string | null;
}

export interface ValidateCouponResultDto {
  coupon: CouponResponseDto;
  discountAmount: number;
  finalAmount: number;
}
