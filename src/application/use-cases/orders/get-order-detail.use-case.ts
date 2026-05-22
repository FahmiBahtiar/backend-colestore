import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';

@Injectable()
export class GetOrderDetailUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  /** Retrieve one order by id. */
  async execute(orderId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return OrderMapper.toResponse(order);
  }
}
