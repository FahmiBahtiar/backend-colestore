import { OrderEntity } from '../../domain/repositories';
import { OrderResponseDto } from '../dtos';

export class OrderMapper {
  /** Map persisted order data to an application response DTO. */
  static toResponse(order: OrderEntity): OrderResponseDto {
    return { ...order };
  }
}
