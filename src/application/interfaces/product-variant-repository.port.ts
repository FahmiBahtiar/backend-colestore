export interface ProductVariantRecord {
  id: string;
  name: string;
  price: number | null;
  stockQuantity: number | null;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Port for product variant persistence used by application use cases. */
export interface IProductVariantRepositoryPort {
  findById(id: string): Promise<ProductVariantRecord | null>;
  findByProductId(productId: string): Promise<ProductVariantRecord[]>;
  create(
    data: Omit<ProductVariantRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ProductVariantRecord>;
  update(
    id: string,
    data: Partial<ProductVariantRecord>,
  ): Promise<ProductVariantRecord>;
  delete(id: string): Promise<void>;
}
