jest.mock('meilisearch', () => {
  return {
    Meilisearch: jest.fn(),
  };
});

import { ListProductsUseCase } from './list-products.use-case';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';
import { MinioService } from '../../../infrastructure/services/minio.service';
import type { MeilisearchService } from '../../../infrastructure/meilisearch';
describe('ListProductsUseCase', () => {
  let repository: jest.Mocked<IProductRepository>;
  let minioService: jest.Mocked<
    Pick<MinioService, 'getPresignedUrl' | 'safeGetPublicMediaUrl'>
  >;
  let meilisearch: jest.Mocked<Pick<MeilisearchService, 'search'>>;
  let useCase: ListProductsUseCase;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findBySlug: jest.fn(),
      findActiveProducts: jest.fn(),
      findByIds: jest.fn(),
    };
    minioService = {
      getPresignedUrl: jest
        .fn()
        .mockResolvedValue(
          'http://localhost:9000/colestore/products/image.png',
        ),
      safeGetPublicMediaUrl: jest
        .fn()
        .mockImplementation((key) =>
          key
            ? Promise.resolve(
                'http://localhost:9000/colestore/products/image.png',
              )
            : Promise.resolve(null),
        ),
    };
    meilisearch = {
      search: jest.fn(),
    };
    useCase = new ListProductsUseCase(
      repository,
      minioService as jest.Mocked<MinioService>,
      meilisearch as unknown as MeilisearchService,
    );
  });

  it('returns mapped active products and total count', async () => {
    const product: ProductEntity = {
      id: 'product-1',
      name: 'Premium Icon Pack',
      slug: 'premium-icon-pack',
      description: null,
      basePrice: 99000,
      isActive: true,
      hasVariants: false,
      stockQuantity: null,
      digitalFileKey: null,
      imageKey: null,
      categoryId: 'category-1',
      createdById: 'admin-1',
      createdAt: new Date('2026-05-23T00:00:00.000Z'),
      updatedAt: new Date('2026-05-23T00:00:00.000Z'),
    };
    repository.findActiveProducts.mockResolvedValue({
      items: [product],
      total: 1,
    });

    await expect(
      useCase.execute({ skip: 0, take: 10, categoryId: 'category-1' }),
    ).resolves.toEqual({
      items: [
        {
          ...product,
          imageUrl: null,
          checkoutFields: undefined,
          variants: undefined,
        },
      ],
      total: 1,
    });
    expect(repository.findActiveProducts.mock.calls[0]?.[0]).toEqual({
      skip: 0,
      take: 10,
      categoryId: 'category-1',
    });
  });
});
