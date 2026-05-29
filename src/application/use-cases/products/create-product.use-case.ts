import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { Product, ProductProps } from '../../../domain/entities';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateProductInputDto, ProductResponseDto } from '../../dtos';
import { ProductMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly minioService: MinioService,
    private readonly eventEmitter: EventEmitter2,
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
      imageKey: input.imageKey ?? null,
      categoryId: input.categoryId ?? null,
      createdById: input.createdById,
      checkoutFields: input.checkoutFields
        ? input.checkoutFields.map((f) => ({
            id: f.id ?? 'new-field',
            productId: 'new-product',
            label: f.label,
            type: f.type,
            isRequired: f.isRequired,
          }))
        : undefined,
      createdAt: now,
      updatedAt: now,
    });

    const props = product.toPrimitives();
    const created = await this.productRepository.create(
      this.toCreateData(props),
    );

    this.eventEmitter.emit('product.created', { productId: created.id });

    let imageUrl: string | null = null;
    if (created.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(created.imageKey);
      } catch (err) {
        this.logger.error(
          `Failed to resolve presigned URL for product image ${created.imageKey}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    return ProductMapper.toResponse(created, imageUrl);
  }

  private toCreateData(
    product: ProductProps,
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
      imageKey: product.imageKey ?? null,
      categoryId: product.categoryId,
      createdById: product.createdById,
      checkoutFields: product.checkoutFields,
    };
  }
}
