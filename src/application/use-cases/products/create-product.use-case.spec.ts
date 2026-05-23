import { ConflictException } from '@nestjs/common';
import { CreateProductUseCase } from './create-product.use-case';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';

describe('CreateProductUseCase', () => {
  const now = new Date('2026-05-23T00:00:00.000Z');
  let repository: jest.Mocked<IProductRepository>;
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBySlug: jest.fn(),
      findActiveProducts: jest.fn(),
    };
    useCase = new CreateProductUseCase(repository);
  });

  it('creates a product when slug is unique', async () => {
    const created: ProductEntity = {
      id: 'product-1',
      name: 'Premium Icon Pack',
      slug: 'premium-icon-pack',
      description: 'A curated set of SVG icons.',
      basePrice: 99000,
      isActive: true,
      hasVariants: false,
      stockQuantity: 100,
      digitalFileKey: 'products/icons.zip',
      categoryId: 'category-1',
      createdById: 'admin-1',
      createdAt: now,
      updatedAt: now,
    };
    repository.findBySlug.mockResolvedValue(null);
    repository.create.mockResolvedValue(created);

    await expect(
      useCase.execute({
        name: created.name,
        slug: created.slug,
        description: created.description,
        basePrice: created.basePrice,
        stockQuantity: created.stockQuantity,
        digitalFileKey: created.digitalFileKey,
        categoryId: created.categoryId,
        createdById: created.createdById,
      }),
    ).resolves.toEqual(created);

    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        slug: created.slug,
        isActive: true,
        hasVariants: false,
        stockQuantity: 100,
      }),
    );
  });

  it('throws a conflict when slug already exists', async () => {
    repository.findBySlug.mockResolvedValue({} as ProductEntity);

    await expect(
      useCase.execute({
        name: 'Premium Icon Pack',
        slug: 'premium-icon-pack',
        basePrice: 99000,
        createdById: 'admin-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create.mock.calls).toHaveLength(0);
  });
});
