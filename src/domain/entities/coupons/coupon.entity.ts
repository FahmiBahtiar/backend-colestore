import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface CouponProps {
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

/**
 * Coupon entity with redemption eligibility and discount rules.
 */
export class Coupon extends BaseEntity {
  private props: CouponProps;

  private constructor(props: CouponProps) {
    super(props);
    this.props = { ...props, code: props.code.toUpperCase() };
    this.validate();
  }

  /** Create a Coupon entity from persisted properties. */
  static create(props: CouponProps): Coupon {
    return new Coupon(props);
  }

  /** Determine whether coupon can be used for an order amount. */
  canRedeem(orderAmount: number, at = new Date()): boolean {
    this.requireNonNegative(orderAmount, 'Order amount cannot be negative');
    return (
      this.props.isActive &&
      orderAmount >= this.props.minOrderAmount &&
      !this.isExpired(at) &&
      !this.isUsageLimitReached()
    );
  }

  /** Calculate discount and never exceed order amount. */
  calculateDiscount(orderAmount: number): number {
    if (!this.canRedeem(orderAmount)) {
      throw new DomainError('Coupon cannot be redeemed for this order');
    }

    const discount =
      this.props.discountType === 'PERCENTAGE'
        ? orderAmount * (this.props.discountValue / 100)
        : this.props.discountValue;

    return Math.min(discount, orderAmount);
  }

  /** Increment usage count after successful redemption. */
  markRedeemed(): void {
    if (this.isUsageLimitReached()) {
      throw new DomainError('Coupon usage limit has been reached');
    }
    this.props.usedCount += 1;
  }

  /** Return plain properties for persistence or mapping. */
  toPrimitives(): CouponProps {
    return { ...this.props };
  }

  private isExpired(at: Date): boolean {
    return (
      this.props.expiresAt !== null &&
      this.props.expiresAt.getTime() <= at.getTime()
    );
  }

  private isUsageLimitReached(): boolean {
    return (
      this.props.maxUses !== null && this.props.usedCount >= this.props.maxUses
    );
  }

  private validate(): void {
    this.requireNonEmpty(this.props.code, 'Coupon code is required');
    if (!['PERCENTAGE', 'FIXED'].includes(this.props.discountType)) {
      throw new DomainError('Coupon discount type must be PERCENTAGE or FIXED');
    }
    this.requirePositive(
      this.props.discountValue,
      'Coupon discount value must be positive',
    );
    if (
      this.props.discountType === 'PERCENTAGE' &&
      this.props.discountValue > 100
    ) {
      throw new DomainError('Percentage coupon cannot exceed 100');
    }
    this.requireNonNegative(
      this.props.minOrderAmount,
      'Minimum order amount cannot be negative',
    );
    this.requireInteger(
      this.props.usedCount,
      'Coupon used count must be an integer',
    );
    this.requireNonNegative(
      this.props.usedCount,
      'Coupon used count cannot be negative',
    );
    if (this.props.maxUses !== null) {
      this.requireInteger(
        this.props.maxUses,
        'Coupon max uses must be an integer',
      );
      this.requirePositive(
        this.props.maxUses,
        'Coupon max uses must be greater than zero',
      );
    }
  }
}
