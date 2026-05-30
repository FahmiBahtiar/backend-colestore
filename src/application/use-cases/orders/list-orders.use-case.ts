import { Inject, Injectable, Logger } from '@nestjs/common';
import { IOrderRepository, OrderEntity } from '../../../domain/repositories';
import { ORDER_REPOSITORY } from '../../../domain/repositories/tokens';
import { ListAllOrdersInputDto, OrderResponseDto } from '../../dtos';
import { OrderMapper } from '../../mappers';
import { MeilisearchService } from '../../../infrastructure/meilisearch';

@Injectable()
export class ListOrdersUseCase {
  private readonly logger = new Logger(ListOrdersUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly meilisearch: MeilisearchService,
  ) {}

  /** List all orders for admin management. */
  async execute(input: ListAllOrdersInputDto = {}): Promise<{
    items: OrderResponseDto[];
    data: OrderResponseDto[];
    total: number;
    nextCursor: string | null;
    hasNextPage: boolean;
    limit?: number;
  }> {
    const useSearch = !!input.search && input.search.trim().length > 0;

    if (useSearch) {
      // 1. Resolve offset from synthetic cursor (Base64 offset container)
      let offset = 0;
      if (input.cursor) {
        try {
          const decodedJson = Buffer.from(input.cursor, 'base64').toString(
            'utf-8',
          );
          const decoded = JSON.parse(decodedJson) as Record<string, unknown>;
          if (decoded && typeof decoded.offset === 'number') {
            offset = decoded.offset;
          }
        } catch {
          // Fallback to offset 0
        }
      }

      const take = Math.min(input.take || 20, 100);

      // 2. Map date filters and order status filters to Meilisearch filter string
      const filterArray: string[] = [];
      if (input.status) {
        filterArray.push(`status = "${input.status}"`);
      }
      if (input.startDate) {
        filterArray.push(`createdAt >= "${input.startDate}"`);
      }
      if (input.endDate) {
        filterArray.push(`createdAt <= "${input.endDate}"`);
      }

      const msResult = await this.meilisearch.search<{ id: string }>(
        'orders',
        input.search!,
        {
          filter:
            filterArray.length > 0 ? filterArray.join(' AND ') : undefined,
          limit: take,
          offset: offset,
          sort: ['createdAt:desc'],
        },
      );

      if (msResult) {
        let orderEntities: OrderEntity[] = [];
        if (msResult.hits.length > 0) {
          const orderIds = msResult.hits.map((h) => h.id);
          const dbOrders = await this.orderRepository.findByIds(orderIds);

          // Re-sort dbOrders matching the Meilisearch relevance/date sorted hits
          orderEntities = orderIds
            .map((id) => dbOrders.find((o) => o.id === id))
            .filter((o): o is OrderEntity => !!o);
        }

        const hasNextPage = offset + take < msResult.total;
        const nextCursor = hasNextPage
          ? Buffer.from(JSON.stringify({ offset: offset + take })).toString(
              'base64',
            )
          : null;

        const mappedItems = orderEntities.map((order) =>
          OrderMapper.toAdminSummaryResponse(order),
        );

        return {
          items: mappedItems,
          data: mappedItems,
          total: msResult.total,
          nextCursor,
          hasNextPage,
          limit: take,
        };
      } else {
        // Fallback: Meilisearch is down. Route to capped DB search (take is strictly limited to 20)
        this.logger.warn(
          `Meilisearch down. Reverting to database fallback query capped at 20 for: "${input.search}"`,
        );
        const cappedTake = Math.min(input.take || 20, 20);

        const result = await this.orderRepository.findAll({
          ...input,
          take: cappedTake,
        });

        const mappedItems = result.items.map((order) =>
          OrderMapper.toAdminSummaryResponse(order),
        );

        return {
          items: mappedItems,
          data: mappedItems,
          total: result.total,
          nextCursor: result.nextCursor,
          hasNextPage: result.hasNextPage,
          limit: cappedTake,
        };
      }
    }

    // Standard database path (no search query provided)
    const result = await this.orderRepository.findAll({
      skip: input.skip,
      take: input.take,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      sortBy: input.sortBy,
      cursor: input.cursor,
    });

    const mappedItems = result.items.map((order) =>
      OrderMapper.toAdminSummaryResponse(order),
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
