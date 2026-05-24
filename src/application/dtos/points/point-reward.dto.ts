export interface PointRewardResponseDto {
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

export interface CreatePointRewardInputDto {
  name: string;
  description?: string | null;
  pointCost: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount?: number;
  maxRedemptions?: number | null;
  isActive?: boolean;
  expiresAt?: Date | string | null;
}

export interface UpdatePointRewardInputDto {
  id: string;
  name?: string;
  description?: string | null;
  pointCost?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  minOrderAmount?: number;
  maxRedemptions?: number | null;
  isActive?: boolean;
  expiresAt?: Date | string | null;
}

export interface RedeemPointRewardInputDto {
  userId: string;
  rewardId: string;
}

export interface RedeemPointRewardResultDto {
  couponCode: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  expiresAt: Date | null;
  remainingPoints: number;
}
