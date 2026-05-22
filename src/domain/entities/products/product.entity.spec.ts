import { DomainError } from '../../errors';
import { Product, ProductProps } from './product.entity';
import { ProductVariant, ProductVariantProps } from './product-variant.entity';

const now = new Date('2026-01-01T00:00:00.000Z');

function makeProduct(overrides: Partial<ProductProps> = {}): Product {
  return Product.create({
    id: 'product-1',
    name: 'Digital Template',
    slug: 'digital-template',
    description: null,
    basePrice: 100_000,
    isActive: true,
    hasVariants: false,
    stockQuantity: 10,
    digitalFileKey: null,
    categoryId: null,
    createdById: 'admin-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

function makeVariant(
  overrides: Partial<ProductVariantProps> = {},
): ProductVariant {
  return ProductVariant.create({
    id: 'variant-1',
    name: 'Premium',
    price: 150_000,
    stockQuantity: 5,
    productId: 'product-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('Product entity', () => {
  it('rejects variant products that keep stock on the product', () => {
    expect(() => makeProduct({ hasVariants: true, stockQuantity: 10 })).toThrow(
      DomainError,
    );
  });

  it('requires a variant for variant products', () => {
    const product = makeProduct({ hasVariants: true, stockQuantity: null });

    expect(() => product.resolveUnitPrice()).toThrow(DomainError);
  });

  it('rejects variants for non-variant products', () => {
    const product = makeProduct();
    const variant = makeVariant();

    expect(() => product.resolveUnitPrice(variant)).toThrow(DomainError);
  });

  it('resolves variant price when product uses variants', () => {
    const product = makeProduct({ hasVariants: true, stockQuantity: null });
    const variant = makeVariant({ price: 175_000 });

    expect(product.resolveUnitPrice(variant)).toBe(175_000);
  });

  it('decreases product stock for non-variant products', () => {
    const product = makeProduct({ stockQuantity: 3 });

    product.decreaseStock(2);

    expect(product.canFulfill(1)).toBe(true);
    expect(product.canFulfill(2)).toBe(false);
  });

  it('treats null product stock as unlimited/manual stock', () => {
    const product = makeProduct({ stockQuantity: null });

    expect(product.canFulfill(10_000)).toBe(true);
    expect(() => product.decreaseStock(10_000)).not.toThrow();
  });

  it('decreases variant stock for variant products', () => {
    const product = makeProduct({ hasVariants: true, stockQuantity: null });
    const variant = makeVariant({ stockQuantity: 2 });

    product.decreaseStock(2, variant);

    expect(variant.stockQuantity).toBe(0);
    expect(product.canFulfill(1, variant)).toBe(false);
  });
});

describe('ProductVariant entity', () => {
  it('falls back to product base price when variant price is null', () => {
    const variant = makeVariant({ price: null });

    expect(variant.resolvePrice(100_000)).toBe(100_000);
  });

  it('rejects insufficient finite stock', () => {
    const variant = makeVariant({ stockQuantity: 1 });

    expect(() => variant.decreaseStock(2)).toThrow(DomainError);
  });

  it('treats null variant stock as unlimited/manual stock', () => {
    const variant = makeVariant({ stockQuantity: null });

    expect(variant.canFulfill(99_999)).toBe(true);
    expect(() => variant.decreaseStock(99_999)).not.toThrow();
  });
});
