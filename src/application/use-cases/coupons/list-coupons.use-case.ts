import { Inject, Injectable } from '@nestjs/common';
import { ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';
import { CouponResponseDto } from '../../dtos';
import { CouponMapper } from '../../mappers';

@Injectable()
export class ListCouponsUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  /** List coupons with pagination for admin management. */
  async execute(input: { skip?: number; take?: number } = {}): Promise<{
    items: CouponResponseDto[];
    total: number;
  }> {
    const result = await this.couponRepository.findAll(input);
    return {
      items: result.items.map((coupon) => CouponMapper.toResponse(coupon)),
      total: result.meta.total,
    };
  }
}
