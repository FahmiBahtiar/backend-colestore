export interface ProductCheckoutFieldDto {
  id?: string;
  label: string;
  type: string; // TEXT, TEXTAREA
  isRequired: boolean;
}

export interface ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  isActive: boolean;
  hasVariants: boolean;
  stockQuantity: number | null;
  digitalFileKey: string | null;
  categoryId: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  variants?: ProductVariantResponseDto[];
  checkoutFields?: ProductCheckoutFieldDto[];
}

export interface ProductVariantResponseDto {
  id: string;
  name: string;
  price: number | null;
  stockQuantity: number | null;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductInputDto {
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  hasVariants?: boolean;
  stockQuantity?: number | null;
  digitalFileKey?: string | null;
  categoryId?: string | null;
  createdById: string;
  checkoutFields?: ProductCheckoutFieldDto[];
}

export interface UpdateProductInputDto {
  id: string;
  name?: string;
  description?: string | null;
  basePrice?: number;
  isActive?: boolean;
  stockQuantity?: number | null;
  digitalFileKey?: string | null;
  categoryId?: string | null;
  checkoutFields?: ProductCheckoutFieldDto[];
}

export interface CreateProductVariantInputDto {
  productId: string;
  name: string;
  price?: number | null;
  stockQuantity?: number | null;
}

export interface ListProductsInputDto {
  skip?: number;
  take?: number;
  categoryId?: string;
  search?: string;
  includeInactive?: boolean;
}
