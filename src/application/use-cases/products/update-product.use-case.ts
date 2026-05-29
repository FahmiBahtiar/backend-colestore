import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Product } from '../../../domain/entities';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/tokens';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProductResponseDto, UpdateProductInputDto } from '../../dtos';
import { throwBadRequestForDomainError } from '../../errors';
import { ProductMapper } from '../../mappers';
import { MinioService } from '../../../infrastructure/services/minio.service';

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly minioService: MinioService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Update product details while preserving domain invariants. */
  async execute(input: UpdateProductInputDto): Promise<ProductResponseDto> {
    const existing = await this.productRepository.findById(input.id);
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    try {
      Product.create({
        ...existing,
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        basePrice: input.basePrice ?? existing.basePrice,
        isActive: input.isActive ?? existing.isActive,
        stockQuantity: input.stockQuantity ?? existing.stockQuantity,
        digitalFileKey: input.digitalFileKey ?? existing.digitalFileKey,
        imageKey: input.imageKey ?? existing.imageKey,
        categoryId: input.categoryId ?? existing.categoryId,
        checkoutFields: input.checkoutFields
          ? input.checkoutFields.map((f) => ({
              id: f.id ?? 'new-field',
              productId: input.id,
              label: f.label,
              type: f.type,
              isRequired: f.isRequired,
            }))
          : existing.checkoutFields,
      });
    } catch (error) {
      throwBadRequestForDomainError(error);
    }

    const oldImageKey = existing.imageKey;
    const newImageKey = input.imageKey;

    const updated = await this.productRepository.update(
      input.id,
      this.toUpdateData(input),
    );

    this.eventEmitter.emit('product.updated', { productId: updated.id });

    // Clean up old image from MinIO if imageKey was replaced or deleted
    if (
      oldImageKey &&
      newImageKey !== undefined &&
      oldImageKey !== newImageKey
    ) {
      try {
        await this.minioService.deleteObject(oldImageKey);
      } catch (err) {
        this.logger.error(
          `Failed to delete old image from MinIO productId=${input.id} oldImageKey=${oldImageKey} newImageKey=${newImageKey ?? 'null'}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    let imageUrl: string | null = null;
    if (updated.imageKey) {
      try {
        imageUrl = await this.minioService.getPresignedUrl(updated.imageKey);
      } catch (err) {
        this.logger.error(
          `Failed to resolve presigned URL for product image productId=${input.id} imageKey=${updated.imageKey}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    return ProductMapper.toResponse(updated, imageUrl);
  }

  private toUpdateData(input: UpdateProductInputDto): Partial<ProductEntity> {
    return {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.basePrice !== undefined && { basePrice: input.basePrice }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.stockQuantity !== undefined && {
        stockQuantity: input.stockQuantity,
      }),
      ...(input.digitalFileKey !== undefined && {
        digitalFileKey: input.digitalFileKey,
      }),
      ...(input.imageKey !== undefined && {
        imageKey: input.imageKey,
      }),
      ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
      ...(input.checkoutFields !== undefined && {
        checkoutFields: input.checkoutFields.map((f) => ({
          id: f.id ?? 'new-field',
          productId: input.id,
          label: f.label,
          type: f.type,
          isRequired: f.isRequired,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      }),
    };
  }
}
