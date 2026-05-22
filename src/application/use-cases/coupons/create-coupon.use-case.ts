import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Coupon } from '../../../domain/entities';
import { CouponEntity, ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';
import { CouponResponseDto, CreateCouponInputDto } from '../../dtos';
import { CouponMapper } from '../../mappers';

@Injectable()
export class CreateCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  /** Create a coupon after validating discount and redemption rules. */
  async execute(input: CreateCouponInputDto): Promise<CouponResponseDto> {
    const code = input.code.toUpperCase();
    const existing = await this.couponRepository.findByCode(code);
    if (existing) {
      throw new ConflictException('Coupon code already exists');
    }

    const now = new Date();
    const coupon = Coupon.create({
      id: 'new-coupon',
      code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount ?? 0,
      maxUses: input.maxUses ?? null,
      usedCount: 0,
      expiresAt: input.expiresAt ?? null,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.couponRepository.create(
      this.toCreateData(coupon.toPrimitives()),
    );
    return CouponMapper.toResponse(created);
  }

  private toCreateData(
    coupon: CouponEntity,
  ): Omit<CouponEntity, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
    };
  }
}
