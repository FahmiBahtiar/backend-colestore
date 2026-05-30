import { Inject, Injectable } from '@nestjs/common';
import { ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';

@Injectable()
export class DeleteCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  /** Delete a coupon by id. */
  async execute(id: string): Promise<void> {
    await this.couponRepository.delete(id);
  }
}
