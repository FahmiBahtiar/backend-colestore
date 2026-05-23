import { Inject, Injectable } from '@nestjs/common';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListAllOrdersInputDto, OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  /** List all orders for admin management. */
  async execute(input: ListAllOrdersInputDto = {}): Promise<{
    items: OrderResponseDto[];
    total: number;
  }> {
    const result = await this.orderRepository.findAll({
      skip: input.skip,
      take: input.take,
    });
    return {
      items: result.items.map((order) => OrderMapper.toResponse(order)),
      total: result.meta.total,
    };
  }
}
