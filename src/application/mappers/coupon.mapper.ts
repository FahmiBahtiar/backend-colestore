import { CouponEntity } from '../../domain/repositories';
import { CouponResponseDto } from '../dtos';

export class CouponMapper {
  /** Map persisted coupon data to an application response DTO. */
  static toResponse(coupon: CouponEntity): CouponResponseDto {
    return { ...coupon };
  }
}
