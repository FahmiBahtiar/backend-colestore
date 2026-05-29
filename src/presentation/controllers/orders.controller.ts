import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CancelOrderUseCase,
  GetOrderDetailUseCase,
  GetUserOrdersUseCase,
  ListOrdersUseCase,
  PlaceOrderUseCase,
} from '../../application/use-cases';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ListOrdersQueryDto, PlaceOrderRequestDto } from '../dtos';
import { JwtAuthGuard, RolesGuard, OptionalJwtAuthGuard } from '../guards';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase,
    private readonly getUserOrdersUseCase: GetUserOrdersUseCase,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  /** Place an order for the current buyer (supports guest checkout). */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Place order' })
  @ApiResponse({ status: 201, description: 'Order placed.' })
  async placeOrder(
    @Body() body: PlaceOrderRequestDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
    @CurrentUser() user?: AuthenticatedUser | null,
  ) {
    if (!idempotencyKey || !idempotencyKey.trim()) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }

    return this.placeOrderUseCase.execute({
      userId: user?.id ?? null,
      items: body.items,
      couponCode: body.couponCode,
      customerEmail: body.customerEmail,
      customerWhatsapp: body.customerWhatsapp,
      paymentMethodType: body.paymentMethodType,
      paymentChannel: body.paymentChannel,
      idempotencyKey,
    });
  }

  /** List orders owned by the current buyer. */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('BUYER')
  @ApiOperation({ summary: 'List current user orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved.' })
  async listMyOrders(
    @Query() query: ListOrdersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.getUserOrdersUseCase.execute({ userId: user.id, ...query });
  }

  /** List all orders as an admin. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved.' })
  async listOrders(@Query() query: ListOrdersQueryDto) {
    return this.listOrdersUseCase.execute(query);
  }

  /** Retrieve an order by id (accessible by buyers, admins, and guest users via unique CUID link). */
  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Order retrieved.' })
  async getOrderDetail(@Param('id') id: string) {
    return this.getOrderDetailUseCase.execute(id);
  }

  /** Cancel an order as a safe delete operation. */
  @Delete(':id')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled.' })
  async cancelOrder(@Param('id') id: string) {
    return this.cancelOrderUseCase.execute(id);
  }
}
