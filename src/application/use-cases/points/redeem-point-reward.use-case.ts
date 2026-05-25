import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  POINT_TRANSACTION_REPOSITORY,
  POINT_REWARD_REPOSITORY,
  COUPON_REPOSITORY,
  IPointTransactionRepository,
  IPointRewardRepository,
  ICouponRepository,
} from '../../../domain/repositories';
import { PointReward } from '../../../domain/entities/points/point-reward.entity';
import { RedeemPointRewardResultDto } from '../../dtos/points/point-reward.dto';

@Injectable()
export class RedeemPointRewardUseCase {
  constructor(
    @Inject(POINT_TRANSACTION_REPOSITORY)
    private readonly pointTxRepo: IPointTransactionRepository,
    @Inject(POINT_REWARD_REPOSITORY)
    private readonly pointRewardRepo: IPointRewardRepository,
    @Inject(COUPON_REPOSITORY)
    private readonly couponRepo: ICouponRepository,
  ) {}

  async execute(
    userId: string,
    rewardId: string,
  ): Promise<RedeemPointRewardResultDto> {
    // 1. Fetch and reconstruct PointReward aggregate
    const rewardEntity = await this.pointRewardRepo.findById(rewardId);
    if (!rewardEntity) {
      throw new NotFoundException('Point reward not found');
    }

    const reward = PointReward.create(rewardEntity);

    // 2. Validate reward is redeemable (active, not expired, not sold out)
    reward.ensureRedeemable();

    // 3. Check user point balance
    const totalPoints = await this.pointTxRepo.getTotalPointsByUserId(userId);
    if (totalPoints < reward.pointCost) {
      throw new BadRequestException(
        `Insufficient points. Required: ${reward.pointCost}, Available: ${totalPoints}`,
      );
    }

    // 4. Generate premium custom coupon code
    const sanitizedName = reward.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 4);
    const randomSuffix = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const couponCode = `RP-${sanitizedName}-${randomSuffix}`;

    // 5. Create the Coupon
    // Expiration: 30 days from now, or reward expiration if sooner
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiresAt =
      reward.expiresAt && reward.expiresAt < thirtyDaysFromNow
        ? reward.expiresAt
        : thirtyDaysFromNow;

    const coupon = await this.couponRepo.create({
      code: couponCode,
      discountType: reward.discountType,
      discountValue: reward.discountValue,
      minOrderAmount: reward.minOrderAmount,
      maxUses: 1, // Single-use coupon
      usedCount: 0,
      isActive: true,
      expiresAt,
      userId,
    });

    // 6. Deduct points via a REDEEMED transaction
    await this.pointTxRepo.create({
      userId,
      orderId: null,
      type: 'REDEEMED',
      points: reward.pointCost,
      amount: 0, // No cash value/transaction amount
      couponId: coupon.id,
    });

    // 7. Increment PointReward redemption count
    await this.pointRewardRepo.incrementRedeemedCount(reward.id);

    const remainingPoints = totalPoints - reward.pointCost;

    return {
      couponCode: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      expiresAt: coupon.expiresAt,
      remainingPoints,
    };
  }
}
