import { Inject, Injectable } from '@nestjs/common';
import { IOrderRepository } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListOrdersInputDto, OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';

@Injectable()
export class GetUserOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  /** List orders that belong to a specific user. */
  async execute(input: ListOrdersInputDto): Promise<{
    items: OrderResponseDto[];
    data: OrderResponseDto[];
    total: number;
    nextCursor: string | null;
    hasNextPage: boolean;
    limit?: number;
  }> {
    const result = await this.orderRepository.findByUserId(input.userId, {
      skip: input.skip,
      take: input.take,
      status: input.status,
      search: input.search,
      startDate: input.startDate,
      endDate: input.endDate,
      sortBy: input.sortBy,
      cursor: input.cursor,
    });
    const mappedItems = result.items.map((order) =>
      OrderMapper.toBuyerSummaryResponse(order),
    );
    return {
      items: mappedItems,
      data: mappedItems,
      total: result.total,
      nextCursor: result.nextCursor,
      hasNextPage: result.hasNextPage,
      limit: result.limit,
    };
  }
}
