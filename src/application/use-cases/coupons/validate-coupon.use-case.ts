import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon } from '../../../domain/entities';
import { ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';
import { ValidateCouponInputDto, ValidateCouponResultDto } from '../../dtos';
import { CouponMapper } from '../../mappers';

@Injectable()
export class ValidateCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  /** Validate coupon eligibility and calculate the resulting discount. */
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
    const discountAmount = coupon.calculateDiscount(input.orderAmount);

    return {
      coupon: CouponMapper.toResponse(couponRecord),
      discountAmount,
      finalAmount: input.orderAmount - discountAmount,
    };
  }
}
