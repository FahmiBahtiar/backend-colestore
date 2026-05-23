import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ProductsController } from '../src/presentation/controllers';
import {
  CreateProductUseCase,
  CreateProductVariantUseCase,
  DeactivateProductUseCase,
  GetProductDetailUseCase,
  ListProductsUseCase,
  UpdateProductUseCase,
} from '../src/application/use-cases';

describe('ProductsController (integration)', () => {
  let app: INestApplication<App>;
  const listProductsUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: CreateProductUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateProductUseCase, useValue: { execute: jest.fn() } },
        {
          provide: CreateProductVariantUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ListProductsUseCase, useValue: listProductsUseCase },
        { provide: GetProductDetailUseCase, useValue: { execute: jest.fn() } },
        { provide: DeactivateProductUseCase, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app?.close();
  });

  it('GET /products returns active products', async () => {
    const payload = {
      items: [
        {
          id: 'product-1',
          name: 'Premium Icon Pack',
          slug: 'premium-icon-pack',
          description: null,
          basePrice: 99000,
          isActive: true,
          hasVariants: false,
          stockQuantity: null,
          digitalFileKey: null,
          categoryId: null,
          createdById: 'admin-1',
          createdAt: new Date('2026-05-23T00:00:00.000Z'),
          updatedAt: new Date('2026-05-23T00:00:00.000Z'),
        },
      ],
      total: 1,
    };
    listProductsUseCase.execute.mockResolvedValue(payload);

    const response = await request(app.getHttpServer())
      .get('/products?skip=0&take=10')
      .expect(200);

    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          id: 'product-1',
          slug: 'premium-icon-pack',
        }),
      ],
      total: 1,
    });
    expect(listProductsUseCase.execute).toHaveBeenCalledWith({
      skip: '0',
      take: '10',
    });
  });
});
