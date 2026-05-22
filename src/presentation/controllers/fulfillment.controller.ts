import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  DeliverOrderUseCase,
  RefundOrderUseCase,
  StartOrderProcessingUseCase,
} from '../../application/use-cases';
import { CurrentUser, Roles } from '../../common/decorators';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { DeliverOrderRequestDto } from '../dtos';
import { JwtAuthGuard, RolesGuard } from '../guards';

@ApiTags('fulfillment')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT-auth')
export class FulfillmentController {
  constructor(
    private readonly startOrderProcessingUseCase: StartOrderProcessingUseCase,
    private readonly deliverOrderUseCase: DeliverOrderUseCase,
    private readonly refundOrderUseCase: RefundOrderUseCase,
  ) {}

  /** Move a paid order into manual processing. */
  @Patch(':id/processing')
  @ApiOperation({ summary: 'Start order processing' })
  @ApiResponse({ status: 200, description: 'Order is now processing.' })
  async startProcessing(@Param('id') orderId: string) {
    return this.startOrderProcessingUseCase.execute({ orderId });
  }

  /** Mark an order as manually delivered by the current admin. */
  @Patch(':id/deliver')
  @ApiOperation({ summary: 'Deliver order manually' })
  @ApiResponse({ status: 200, description: 'Order delivered.' })
  async deliverOrder(
    @Param('id') orderId: string,
    @Body() body: DeliverOrderRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliverOrderUseCase.execute({
      orderId,
      deliveredById: user.id,
      deliveryNote: body.deliveryNote,
    });
  }

  /** Mark an eligible paid order as refunded. */
  @Patch(':id/refund')
  @ApiOperation({ summary: 'Refund order' })
  @ApiResponse({ status: 200, description: 'Order refunded.' })
  async refundOrder(@Param('id') orderId: string) {
    return this.refundOrderUseCase.execute({ orderId });
  }
}
