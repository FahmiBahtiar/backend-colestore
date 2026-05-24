import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetUserPointsUseCase,
  RedeemPointRewardUseCase,
  ListPointRewardsUseCase,
} from '../../application/use-cases';
import { CurrentUser } from '../../common/decorators';
import { ListPointsQueryDto } from '../dtos';
import { JwtAuthGuard } from '../guards';
import { AuthenticatedUser } from '../auth/authenticated-user';

@ApiTags('points')
@Controller('points')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PointsController {
  constructor(
    private readonly getUserPointsUseCase: GetUserPointsUseCase,
    private readonly redeemPointRewardUseCase: RedeemPointRewardUseCase,
    private readonly listPointRewardsUseCase: ListPointRewardsUseCase,
  ) {}

  /** Get current user's total points and paginated transaction history */
  @Get('me')
  @ApiOperation({ summary: 'Get my points and transaction history' })
  @ApiResponse({ status: 200, description: 'Points details retrieved.' })
  async getMyPoints(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListPointsQueryDto,
  ) {
    return this.getUserPointsUseCase.execute(user.id, query);
  }

  /** Redeem points for a reward template (generates a checkout coupon) */
  @Post('redeem/:rewardId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Redeem points for a reward' })
  @ApiResponse({
    status: 200,
    description: 'Reward redeemed. Coupon generated.',
  })
  async redeemReward(
    @CurrentUser() user: AuthenticatedUser,
    @Param('rewardId') rewardId: string,
  ) {
    return this.redeemPointRewardUseCase.execute(user.id, rewardId);
  }

  /** Get list of all active point rewards that can be redeemed */
  @Get('rewards')
  @ApiOperation({ summary: 'List active point rewards' })
  @ApiResponse({ status: 200, description: 'Active rewards list retrieved.' })
  async listActiveRewards() {
    return this.listPointRewardsUseCase.execute({ activeOnly: true });
  }
}
