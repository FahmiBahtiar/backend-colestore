import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { OrderActionInputDto, OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';

@Injectable()
export class StartOrderProcessingUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  /** Move a paid order into manual processing. */
  async execute(input: OrderActionInputDto): Promise<OrderResponseDto> {
    const orderRecord = await this.orderRepository.findById(input.orderId);
    if (!orderRecord) throw new NotFoundException('Order not found');

    const order = Order.create(orderRecord);
    order.startProcessing();
    const updated = await this.orderRepository.update(input.orderId, {
      status: order.toPrimitives().status,
    });

    return OrderMapper.toResponse(updated);
  }
}
