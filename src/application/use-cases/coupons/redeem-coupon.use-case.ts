import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon } from '../../../domain/entities';
import { ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';
import { ValidateCouponInputDto, ValidateCouponResultDto } from '../../dtos';
import { throwBadRequestForDomainError } from '../../errors';
import { CouponMapper } from '../../mappers';

@Injectable()
export class RedeemCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  /** Validate and consume one coupon usage. */
  async execute(
    input: ValidateCouponInputDto,
  ): Promise<ValidateCouponResultDto> {
    const couponRecord = await this.couponRepository.findByCode(
      input.code.toUpperCase(),
    );
    if (!couponRecord) {
      throw new NotFoundException('Coupon not found');
    }

    const coupon = Coupon.create(couponRecord);
    const discountAmount = this.redeem(coupon, input.orderAmount);
    await this.couponRepository.incrementUsedCount(couponRecord.id);

    return {
      coupon: CouponMapper.toResponse(coupon.toPrimitives()),
      discountAmount,
      finalAmount: input.orderAmount - discountAmount,
    };
  }

  private redeem(coupon: Coupon, orderAmount: number): number {
    try {
      const discountAmount = coupon.calculateDiscount(orderAmount);
      coupon.markRedeemed();
      return discountAmount;
    } catch (error) {
      throwBadRequestForDomainError(error);
    }
  }
}
