import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Order } from '../../../domain/entities';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { OrderResponseDto } from '../../dtos';
import { throwBadRequestForDomainError } from '../../errors';
import { OrderMapper } from '../../mappers';

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  /** Cancel an order instead of hard-deleting transactional records. */
  async execute(id: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderEntity = Order.create(order);
    try {
      orderEntity.cancel();
    } catch (error) {
      throwBadRequestForDomainError(error);
    }

    const cancelled = await this.orderRepository.updateStatus(
      id,
      orderEntity.toPrimitives().status,
    );
    return OrderMapper.toDetailResponse(cancelled);
  }
}
