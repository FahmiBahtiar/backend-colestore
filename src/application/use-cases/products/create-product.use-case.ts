import * as crypto from 'crypto';
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
    const productId = crypto.randomUUID();
    const product = Product.create({
      id: productId,
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
            id: f.id ?? crypto.randomUUID(),
            productId: productId,
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

    const imageUrl = await this.minioService.safeGetPublicMediaUrl(
      created.imageKey,
    );

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
