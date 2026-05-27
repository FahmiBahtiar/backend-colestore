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
  CreateCouponUseCase,
  DeleteCouponUseCase,
  GetCouponDetailUseCase,
  ListCouponsUseCase,
  UpdateCouponUseCase,
  ValidateCouponUseCase,
} from '../../application/use-cases';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../auth/authenticated-user';
import {
  CreateCouponRequestDto,
  ListCouponsQueryDto,
  UpdateCouponRequestDto,
  ValidateCouponRequestDto,
} from '../dtos';
import { JwtAuthGuard, RolesGuard, OptionalJwtAuthGuard } from '../guards';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
    private readonly listCouponsUseCase: ListCouponsUseCase,
    private readonly getCouponDetailUseCase: GetCouponDetailUseCase,
    private readonly updateCouponUseCase: UpdateCouponUseCase,
    private readonly deleteCouponUseCase: DeleteCouponUseCase,
  ) {}

  /** List coupons as an admin. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List coupons' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved.' })
  async listCoupons(@Query() query: ListCouponsQueryDto) {
    return this.listCouponsUseCase.execute(query);
  }

  /** Retrieve coupon detail as an admin. */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get coupon detail' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved.' })
  async getCouponDetail(@Param('id') id: string) {
    return this.getCouponDetailUseCase.execute(id);
  }

  /** Create a coupon as an admin. */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created.' })
  async createCoupon(@Body() body: CreateCouponRequestDto) {
    return this.createCouponUseCase.execute(body);
  }

  /** Update a coupon as an admin. */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated.' })
  async updateCoupon(
    @Param('id') id: string,
    @Body() body: UpdateCouponRequestDto,
  ) {
    return this.updateCouponUseCase.execute({ id, ...body });
  }

  /** Delete a coupon as an admin. */
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiResponse({ status: 204, description: 'Coupon deleted.' })
  async deleteCoupon(@Param('id') id: string): Promise<void> {
    await this.deleteCouponUseCase.execute(id);
  }

  /** Validate a coupon and calculate discount for an order amount. */
  @Post('validate')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate coupon' })
  @ApiResponse({ status: 200, description: 'Coupon validation result.' })
  async validateCoupon(
    @Body() body: ValidateCouponRequestDto,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    return this.validateCouponUseCase.execute({
      ...body,
      userId: user?.id ?? null,
    });
  }
}
