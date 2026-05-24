import { ProductEntity } from '../../domain/repositories';
import { ProductVariantRecord } from '../interfaces';
import { ProductResponseDto, ProductVariantResponseDto } from '../dtos';

export class ProductMapper {
  /** Map persisted product data to an application response DTO. */
  static toResponse(product: ProductEntity): ProductResponseDto {
    return {
      ...product,
      variants: product.variants
        ? product.variants.map((v) => ProductMapper.variantToResponse(v))
        : undefined,
      checkoutFields: product.checkoutFields
        ? product.checkoutFields.map((f) => ({
            id: f.id,
            label: f.label,
            type: f.type,
            isRequired: f.isRequired,
          }))
        : undefined,
    };
  }

  /** Map persisted variant data to an application response DTO. */
  static variantToResponse(
    variant: ProductVariantRecord,
  ): ProductVariantResponseDto {
    return { ...variant };
  }
}
