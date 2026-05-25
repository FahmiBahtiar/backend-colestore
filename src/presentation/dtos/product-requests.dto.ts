import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
  ValidateNested,
  IsArray,
  IsIn,
} from 'class-validator';

export class ProductCheckoutFieldRequestDto {
  @ApiPropertyOptional({ example: 'clwfield123' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'ID Game' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ example: 'TEXT' })
  @IsString()
  @IsIn(['TEXT', 'TEXTAREA'])
  type: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isRequired: boolean;
}

export class CreateProductRequestDto {
  @ApiProperty({ example: 'Premium Icon Pack' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'premium-icon-pack' })
  @IsString()
  @MinLength(2)
  slug: string;

  @ApiPropertyOptional({ example: 'A curated set of SVG icons.' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 99000 })
  @IsNumber()
  @IsPositive()
  basePrice: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number | null;

  @ApiPropertyOptional({ example: 'products/icons.zip' })
  @IsOptional()
  @IsString()
  digitalFileKey?: string | null;

  @ApiPropertyOptional({ example: 'products/image.png' })
  @IsOptional()
  @IsString()
  imageKey?: string | null;

  @ApiPropertyOptional({ example: 'clwcategory123' })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [ProductCheckoutFieldRequestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCheckoutFieldRequestDto)
  checkoutFields?: ProductCheckoutFieldRequestDto[];
}

export class UpdateProductRequestDto {
  @ApiPropertyOptional({ example: 'Premium Icon Pack v2' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated product description.' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 129000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  basePrice?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number | null;

  @ApiPropertyOptional({ example: 'products/icons-v2.zip' })
  @IsOptional()
  @IsString()
  digitalFileKey?: string | null;

  @ApiPropertyOptional({ example: 'products/image-v2.png' })
  @IsOptional()
  @IsString()
  imageKey?: string | null;

  @ApiPropertyOptional({ example: 'clwcategory123' })
  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [ProductCheckoutFieldRequestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCheckoutFieldRequestDto)
  checkoutFields?: ProductCheckoutFieldRequestDto[];
}

export class CreateProductVariantRequestDto {
  @ApiProperty({ example: 'Commercial License' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 199000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number | null;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number | null;
}

export class ListProductsQueryDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ example: 'clwcategory123' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'mobile legends' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}
