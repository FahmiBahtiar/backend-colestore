import { ProductEntity } from '../../domain/repositories';
import { ProductVariantRecord } from '../interfaces';
import { ProductResponseDto, ProductVariantResponseDto } from '../dtos';

export class ProductMapper {
  /** Map persisted product data to an application response DTO. */
  static toResponse(product: ProductEntity): ProductResponseDto {
    return { ...product };
  }

  /** Map persisted variant data to an application response DTO. */
  static variantToResponse(
    variant: ProductVariantRecord,
  ): ProductVariantResponseDto {
    return { ...variant };
  }
}
