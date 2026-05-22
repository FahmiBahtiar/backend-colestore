import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon } from '../../../domain/entities';
import { ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';
import { ValidateCouponInputDto, ValidateCouponResultDto } from '../../dtos';
import { throwBadRequestForDomainError } from '../../errors';
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
    const discountAmount = this.calculateDiscount(coupon, input.orderAmount);

    return {
      coupon: CouponMapper.toResponse(couponRecord),
      discountAmount,
      finalAmount: input.orderAmount - discountAmount,
    };
  }

  private calculateDiscount(coupon: Coupon, orderAmount: number): number {
    try {
      return coupon.calculateDiscount(orderAmount);
    } catch (error) {
      throwBadRequestForDomainError(error);
    }
  }
}
