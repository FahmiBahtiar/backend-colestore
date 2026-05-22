import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateCouponUseCase,
  ValidateCouponUseCase,
} from '../../application/use-cases';
import { Roles } from '../../common/decorators';
import { CreateCouponRequestDto, ValidateCouponRequestDto } from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('coupons')
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CouponsController {
  constructor(
    private readonly createCouponUseCase: CreateCouponUseCase,
    private readonly validateCouponUseCase: ValidateCouponUseCase,
  ) {}

  /** Create a coupon as an admin. */
  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created.' })
  async createCoupon(@Body() body: CreateCouponRequestDto) {
    return this.createCouponUseCase.execute(body);
  }

  /** Validate a coupon and calculate discount for an order amount. */
  @Post('validate')
  @Roles('BUYER', 'ADMIN')
  @ApiOperation({ summary: 'Validate coupon' })
  @ApiResponse({ status: 200, description: 'Coupon validation result.' })
  async validateCoupon(@Body() body: ValidateCouponRequestDto) {
    return this.validateCouponUseCase.execute(body);
  }
}
