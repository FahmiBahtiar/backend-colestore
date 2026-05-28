import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { DeliverOrderInputDto, OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';
import { AwardOrderPointsUseCase } from '../points/award-order-points.use-case';

@Injectable()
export class DeliverOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly awardOrderPointsUseCase: AwardOrderPointsUseCase,
  ) {}

  /** Mark an order as manually fulfilled by an admin. */
  async execute(input: DeliverOrderInputDto): Promise<OrderResponseDto> {
    const orderRecord = await this.orderRepository.findById(input.orderId);
    if (!orderRecord) throw new NotFoundException('Order not found');

    const order = Order.create(orderRecord);
    order.deliver(input.deliveredById, input.deliveryNote ?? null);
    const props = order.toPrimitives();
    const updated = await this.orderRepository.update(input.orderId, {
      status: props.status,
      deliveredAt: props.deliveredAt,
      deliveredById: props.deliveredById,
      deliveryNote: props.deliveryNote,
    });

    // Award loyalty points only when the transaction is completed (DELIVERED)
    await this.awardOrderPointsUseCase.execute(updated);

    return OrderMapper.toResponse(updated);
  }
}
