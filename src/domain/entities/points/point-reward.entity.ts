import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export type RewardDiscountType = 'PERCENTAGE' | 'FIXED';

export interface PointRewardProps {
  id: string;
  name: string;
  description: string | null;
  pointCost: number;
  discountType: RewardDiscountType;
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
 * An admin-created reward that buyers can redeem with their loyalty points.
 * On redemption a unique coupon is generated for the buyer.
 */
export class PointReward extends BaseEntity {
  private props: PointRewardProps;

  private constructor(props: PointRewardProps) {
    super(props);
    this.props = { ...props };
    this.validate();
  }

  static create(props: PointRewardProps): PointReward {
    return new PointReward(props);
  }

  get name(): string {
    return this.props.name;
  }

  get pointCost(): number {
    return this.props.pointCost;
  }

  get discountType(): RewardDiscountType {
    return this.props.discountType;
  }

  get discountValue(): number {
    return this.props.discountValue;
  }

  get minOrderAmount(): number {
    return this.props.minOrderAmount;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get redeemedCount(): number {
    return this.props.redeemedCount;
  }

  get maxRedemptions(): number | null {
    return this.props.maxRedemptions;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  /** Check whether this reward can still be redeemed. */
  ensureRedeemable(): void {
    if (!this.props.isActive) {
      throw new DomainError('Reward is no longer active');
    }
    if (
      this.props.maxRedemptions !== null &&
      this.props.redeemedCount >= this.props.maxRedemptions
    ) {
      throw new DomainError('Reward has reached maximum redemptions');
    }
    if (this.props.expiresAt && new Date() > this.props.expiresAt) {
      throw new DomainError('Reward has expired');
    }
  }

  /** Increment the redemption counter. */
  markRedeemed(): void {
    this.ensureRedeemable();
    this.props.redeemedCount += 1;
  }

  toPrimitives(): PointRewardProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.name, 'Reward name is required');
    this.requirePositive(
      this.props.pointCost,
      'Point cost must be a positive integer',
    );
    this.requirePositive(
      this.props.discountValue,
      'Discount value must be positive',
    );
    if (!['PERCENTAGE', 'FIXED'].includes(this.props.discountType)) {
      throw new DomainError('Invalid discount type');
    }
  }
}
