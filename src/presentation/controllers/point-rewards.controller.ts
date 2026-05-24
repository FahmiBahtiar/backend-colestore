import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreatePointRewardUseCase,
  ListPointRewardsUseCase,
  UpdatePointRewardUseCase,
  DeletePointRewardUseCase,
} from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import {
  CreatePointRewardRequestDto,
  ListPointRewardsQueryDto,
  UpdatePointRewardRequestDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('admin/point-rewards')
@Controller('admin/point-rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-auth')
export class PointRewardsController {
  constructor(
    private readonly createPointRewardUseCase: CreatePointRewardUseCase,
    private readonly listPointRewardsUseCase: ListPointRewardsUseCase,
    private readonly updatePointRewardUseCase: UpdatePointRewardUseCase,
    private readonly deletePointRewardUseCase: DeletePointRewardUseCase,
  ) {}

  /** Create a new point reward template */
  @Post()
  @ApiOperation({ summary: 'Create point reward' })
  @ApiResponse({ status: 201, description: 'Point reward created.' })
  async createReward(@Body() body: CreatePointRewardRequestDto) {
    return this.createPointRewardUseCase.execute(body);
  }

  /** List all point rewards with pagination */
  @Get()
  @ApiOperation({ summary: 'List all point rewards' })
  @ApiResponse({ status: 200, description: 'All point rewards retrieved.' })
  async listAllRewards(@Query() query: ListPointRewardsQueryDto) {
    return this.listPointRewardsUseCase.execute({
      activeOnly: false,
      skip: query.skip,
      take: query.take,
    });
  }

  /** Update an existing point reward template */
  @Patch(':id')
  @ApiOperation({ summary: 'Update point reward' })
  @ApiResponse({ status: 200, description: 'Point reward updated.' })
  async updateReward(
    @Param('id') id: string,
    @Body() body: UpdatePointRewardRequestDto,
  ) {
    return this.updatePointRewardUseCase.execute({ id, ...body });
  }

  /** Delete a point reward template */
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete point reward' })
  @ApiResponse({ status: 204, description: 'Point reward deleted.' })
  async deleteReward(@Param('id') id: string): Promise<void> {
    await this.deletePointRewardUseCase.execute(id);
  }
}
