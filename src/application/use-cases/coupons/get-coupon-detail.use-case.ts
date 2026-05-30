import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';
import { CouponResponseDto } from '../../dtos';
import { CouponMapper } from '../../mappers';

@Injectable()
export class GetCouponDetailUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  /** Retrieve one coupon by id. */
  async execute(id: string): Promise<CouponResponseDto> {
    const coupon = await this.couponRepository.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return CouponMapper.toResponse(coupon);
  }
}
