import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Product } from '../../../domain/entities';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { CreateProductInputDto, ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  /** Create a digital product after enforcing domain product invariants. */
  async execute(input: CreateProductInputDto): Promise<ProductResponseDto> {
    const existing = await this.productRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictException('Product slug already exists');
    }

    const now = new Date();
    const product = Product.create({
      id: 'new-product',
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      basePrice: input.basePrice,
      isActive: true,
      hasVariants: input.hasVariants ?? false,
      stockQuantity: input.hasVariants ? null : (input.stockQuantity ?? null),
      digitalFileKey: input.digitalFileKey ?? null,
      categoryId: input.categoryId ?? null,
      createdById: input.createdById,
      createdAt: now,
      updatedAt: now,
    });

    const props = product.toPrimitives();
    const created = await this.productRepository.create(
      this.toCreateData(props),
    );

    return ProductMapper.toResponse(created);
  }

  private toCreateData(
    product: ProductEntity,
  ): Omit<ProductEntity, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: product.basePrice,
      isActive: product.isActive,
      hasVariants: product.hasVariants,
      stockQuantity: product.stockQuantity,
      digitalFileKey: product.digitalFileKey,
      categoryId: product.categoryId,
      createdById: product.createdById,
    };
  }
}
