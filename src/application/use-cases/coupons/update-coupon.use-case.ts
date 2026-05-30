import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CouponEntity, ICouponRepository } from '../../../domain/repositories';
import { COUPON_REPOSITORY } from '../../../domain/repositories/tokens';
import { CouponResponseDto } from '../../dtos';
import { CouponMapper } from '../../mappers';

export type UpdateCouponInputDto = Partial<
  Pick<
    CouponEntity,
    | 'code'
    | 'discountType'
    | 'discountValue'
    | 'minOrderAmount'
    | 'maxUses'
    | 'expiresAt'
    | 'isActive'
  >
> & { id: string };

@Injectable()
export class UpdateCouponUseCase {
  constructor(
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepository: ICouponRepository,
  ) {}

  /** Update coupon configuration while keeping code unique. */
  async execute(input: UpdateCouponInputDto): Promise<CouponResponseDto> {
    const existing = await this.couponRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    const normalizedCode = input.code?.toUpperCase();
    if (normalizedCode && normalizedCode !== existing.code) {
      const codeOwner = await this.couponRepository.findByCode(normalizedCode);
      if (codeOwner) {
        throw new ConflictException('Coupon code already exists');
      }
    }

    const updated = await this.couponRepository.update(input.id, {
      ...(normalizedCode !== undefined && { code: normalizedCode }),
      ...(input.discountType !== undefined && {
        discountType: input.discountType,
      }),
      ...(input.discountValue !== undefined && {
        discountValue: input.discountValue,
      }),
      ...(input.minOrderAmount !== undefined && {
        minOrderAmount: input.minOrderAmount,
      }),
      ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
      ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    });
    return CouponMapper.toResponse(updated);
  }
}
