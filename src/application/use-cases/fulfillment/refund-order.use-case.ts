import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { OrderActionInputDto, OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';
import { RevokeOrderPointsUseCase } from '../points/revoke-order-points.use-case';

@Injectable()
export class RefundOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly revokeOrderPointsUseCase: RevokeOrderPointsUseCase,
  ) {}

  /** Mark a paid, processing, or delivered order as refunded. */
  async execute(input: OrderActionInputDto): Promise<OrderResponseDto> {
    const orderRecord = await this.orderRepository.findById(input.orderId);
    if (!orderRecord) throw new NotFoundException('Order not found');

    const order = Order.create(orderRecord);
    order.refund();
    const updated = await this.orderRepository.update(input.orderId, {
      status: order.toPrimitives().status,
    });

    await this.revokeOrderPointsUseCase.execute(updated);

    return OrderMapper.toDetailResponse(updated);
  }
}
