import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export interface ProductVariantProps {
  id: string;
  name: string;
  price: number | null;
  stockQuantity: number | null;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product variant entity for optional pricing and independent stock.
 */
export class ProductVariant extends BaseEntity {
  private props: ProductVariantProps;

  private constructor(props: ProductVariantProps) {
    super(props);
    this.props = { ...props };
    this.validate();
  }

  /** Create a ProductVariant entity from persisted properties. */
  static create(props: ProductVariantProps): ProductVariant {
    return new ProductVariant(props);
  }

  /** Variant stock quantity, null means unlimited/manual stock. */
  get stockQuantity(): number | null {
    return this.props.stockQuantity;
  }

  /** Resolve effective price from variant override or product base price. */
  resolvePrice(productBasePrice: number): number {
    this.requirePositive(
      productBasePrice,
      'Product base price must be positive',
    );
    return this.props.price ?? productBasePrice;
  }

  /** Check if requested quantity can be fulfilled. */
  canFulfill(quantity: number): boolean {
    this.validateQuantity(quantity);
    return (
      this.props.stockQuantity === null || this.props.stockQuantity >= quantity
    );
  }

  /** Decrease finite stock for an order item. */
  decreaseStock(quantity: number): void {
    this.validateQuantity(quantity);
    if (this.props.stockQuantity === null) return;
    if (this.props.stockQuantity < quantity) {
      throw new DomainError('Insufficient variant stock');
    }
    this.props.stockQuantity -= quantity;
  }

  /** Return plain properties for persistence or mapping. */
  toPrimitives(): ProductVariantProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.name, 'Variant name is required');
    this.requireNonEmpty(
      this.props.productId,
      'Variant product id is required',
    );
    if (this.props.price !== null) {
      this.requirePositive(this.props.price, 'Variant price must be positive');
    }
    if (this.props.stockQuantity !== null) {
      this.requireInteger(
        this.props.stockQuantity,
        'Variant stock must be an integer',
      );
      this.requireNonNegative(
        this.props.stockQuantity,
        'Variant stock cannot be negative',
      );
    }
  }

  private validateQuantity(quantity: number): void {
    this.requireInteger(quantity, 'Quantity must be an integer');
    this.requirePositive(quantity, 'Quantity must be greater than zero');
  }
}
