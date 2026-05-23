import { ListProductsUseCase } from './list-products.use-case';
import {
  IProductRepository,
  ProductEntity,
} from '../../../domain/repositories';

describe('ListProductsUseCase', () => {
  let repository: jest.Mocked<IProductRepository>;
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
    };
    useCase = new ListProductsUseCase(repository);
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
    ).resolves.toEqual({ items: [product], total: 1 });
    expect(repository.findActiveProducts.mock.calls[0]?.[0]).toEqual({
      skip: 0,
      take: 10,
      categoryId: 'category-1',
    });
  });
});
