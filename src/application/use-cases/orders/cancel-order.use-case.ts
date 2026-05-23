import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { OrderResponseDto } from '../../dtos';
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
    if (['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(
        'Order cannot be cancelled from current status',
      );
    }

    const cancelled = await this.orderRepository.updateStatus(id, 'CANCELLED');
    return OrderMapper.toResponse(cancelled);
  }
}
