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
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(
    private readonly placeOrderUseCase: PlaceOrderUseCase,
    private readonly getUserOrdersUseCase: GetUserOrdersUseCase,
    private readonly getOrderDetailUseCase: GetOrderDetailUseCase,
    private readonly listOrdersUseCase: ListOrdersUseCase,
    private readonly cancelOrderUseCase: CancelOrderUseCase,
  ) {}

  /** Place an order for the current buyer. */
  @Post()
  @Roles('BUYER')
  @ApiOperation({ summary: 'Place order' })
  @ApiResponse({ status: 201, description: 'Order placed.' })
  async placeOrder(
    @Body() body: PlaceOrderRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.placeOrderUseCase.execute({
      userId: user.id,
      items: body.items,
      couponCode: body.couponCode,
    });
  }

  /** List orders owned by the current buyer. */
  @Get('me')
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
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved.' })
  async listOrders(@Query() query: ListOrdersQueryDto) {
    return this.listOrdersUseCase.execute(query);
  }

  /** Retrieve an order by id for buyer or admin views. */
  @Get(':id')
  @Roles('BUYER', 'ADMIN')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiResponse({ status: 200, description: 'Order retrieved.' })
  async getOrderDetail(@Param('id') id: string) {
    return this.getOrderDetailUseCase.execute(id);
  }

  /** Cancel an order as a safe delete operation. */
  @Delete(':id')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cancel order' })
  @ApiResponse({ status: 200, description: 'Order cancelled.' })
  async cancelOrder(@Param('id') id: string) {
    return this.cancelOrderUseCase.execute(id);
  }
}
