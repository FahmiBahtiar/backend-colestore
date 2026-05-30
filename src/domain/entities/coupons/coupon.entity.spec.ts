import { DomainError } from '../../errors';
import { Coupon, CouponProps } from './coupon.entity';

const now = new Date('2026-01-01T00:00:00.000Z');

function makeCoupon(overrides: Partial<CouponProps> = {}): Coupon {
  return Coupon.create({
    id: 'coupon-1',
    code: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minOrderAmount: 50_000,
    maxUses: 10,
    usedCount: 0,
    expiresAt: new Date('2026-12-31T00:00:00.000Z'),
    isActive: true,
    userId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('Coupon entity', () => {
  it('calculates percentage discounts', () => {
    const coupon = makeCoupon({ discountValue: 15 });

    expect(coupon.calculateDiscount(100_000)).toBe(15_000);
  });

  it('calculates fixed discounts', () => {
    const coupon = makeCoupon({ discountType: 'FIXED', discountValue: 25_000 });

    expect(coupon.calculateDiscount(100_000)).toBe(25_000);
  });

  it('caps fixed discounts to the order amount', () => {
    const coupon = makeCoupon({
      discountType: 'FIXED',
      discountValue: 150_000,
      minOrderAmount: 0,
    });

    expect(coupon.calculateDiscount(100_000)).toBe(100_000);
  });

  it('rejects percentage discounts above 100 percent', () => {
    expect(() => makeCoupon({ discountValue: 101 })).toThrow(DomainError);
  });

  it('does not redeem inactive, expired, overused, or under-minimum coupons', () => {
    expect(makeCoupon({ isActive: false }).canRedeem(100_000, now)).toBe(false);
    expect(
      makeCoupon({ expiresAt: new Date('2025-01-01T00:00:00.000Z') }).canRedeem(
        100_000,
        now,
      ),
    ).toBe(false);
    expect(
      makeCoupon({ maxUses: 1, usedCount: 1 }).canRedeem(100_000, now),
    ).toBe(false);
    expect(
      makeCoupon({ minOrderAmount: 200_000 }).canRedeem(100_000, now),
    ).toBe(false);
  });

  it('increments usage count until the max usage is reached', () => {
    const coupon = makeCoupon({ maxUses: 1, usedCount: 0 });

    coupon.markRedeemed();

    expect(coupon.toPrimitives().usedCount).toBe(1);
    expect(() => coupon.markRedeemed()).toThrow(DomainError);
  });
});
