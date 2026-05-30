import { BaseEntity } from '../shared/base.entity';
import { ProductVariant } from './product-variant.entity';
import { DomainError } from '../../errors';

export interface ProductProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  isActive: boolean;
  hasVariants: boolean;
  stockQuantity: number | null;
  digitalFileKey: string | null;
  imageKey?: string | null;
  categoryId: string | null;
  createdById: string;
  checkoutFields?: {
    id: string;
    productId: string;
    label: string;
    type: string;
    isRequired: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product aggregate root with digital product stock and variant rules.
 */
export class Product extends BaseEntity {
  private props: ProductProps;

  private constructor(props: ProductProps) {
    super(props);
    this.props = { ...props, imageKey: props.imageKey ?? null };
    this.validate();
  }

  /** Create a Product entity from persisted properties. */
  static create(props: ProductProps): Product {
    return new Product(props);
  }

  /** Product base price. */
  get basePrice(): number {
    return this.props.basePrice;
  }

  /** Dynamic fields for product checkout. */
  get checkoutFields(): ProductProps['checkoutFields'] {
    return this.props.checkoutFields;
  }

  /** Whether this product uses variants for stock and price. */
  get hasVariants(): boolean {
    return this.props.hasVariants;
  }

  /** Activate the product for purchase. */
  activate(): void {
    this.props.isActive = true;
  }

  /** Deactivate the product from purchase. */
  deactivate(): void {
    this.props.isActive = false;
  }

  /** Assert product is purchasable. */
  ensurePurchasable(): void {
    if (!this.props.isActive) {
      throw new DomainError('Inactive products cannot be purchased');
    }
  }

  /** Resolve purchasable unit price with optional variant override. */
  resolveUnitPrice(variant?: ProductVariant | null): number {
    this.ensureVariantRule(variant);
    return variant?.resolvePrice(this.props.basePrice) ?? this.props.basePrice;
  }

  /** Check if requested quantity can be fulfilled. */
  canFulfill(quantity: number, variant?: ProductVariant | null): boolean {
    this.validateQuantity(quantity);
    this.ensureVariantRule(variant);

    if (this.props.hasVariants) {
      return Boolean(variant?.canFulfill(quantity));
    }

    return (
      this.props.stockQuantity === null || this.props.stockQuantity >= quantity
    );
  }

  /** Decrease finite stock using product or variant stock based on product mode. */
  decreaseStock(quantity: number, variant?: ProductVariant | null): void {
    this.validateQuantity(quantity);
    this.ensureVariantRule(variant);

    if (this.props.hasVariants) {
      variant?.decreaseStock(quantity);
      return;
    }

    if (this.props.stockQuantity === null) return;
    if (this.props.stockQuantity < quantity) {
      throw new DomainError('Insufficient product stock');
    }
    this.props.stockQuantity -= quantity;
  }

  /** Return plain properties for persistence or mapping. */
  toPrimitives(): ProductProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.name, 'Product name is required');
    this.requireNonEmpty(this.props.slug, 'Product slug is required');
    this.requireNonEmpty(
      this.props.createdById,
      'Product creator id is required',
    );
    this.requirePositive(
      this.props.basePrice,
      'Product base price must be positive',
    );
    if (this.props.stockQuantity !== null) {
      this.requireInteger(
        this.props.stockQuantity,
        'Product stock must be an integer',
      );
      this.requireNonNegative(
        this.props.stockQuantity,
        'Product stock cannot be negative',
      );
    }
    if (this.props.hasVariants && this.props.stockQuantity !== null) {
      throw new DomainError('Variant products must manage stock on variants');
    }
  }

  private ensureVariantRule(variant?: ProductVariant | null): void {
    if (this.props.hasVariants && !variant) {
      throw new DomainError('Variant product requires a selected variant');
    }
    if (!this.props.hasVariants && variant) {
      throw new DomainError('Non-variant product cannot use a variant');
    }
  }

  private validateQuantity(quantity: number): void {
    this.requireInteger(quantity, 'Quantity must be an integer');
    this.requirePositive(quantity, 'Quantity must be greater than zero');
  }
}
