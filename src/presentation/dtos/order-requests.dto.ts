import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemRequestDto {
  @ApiProperty({ example: 'clwproduct123' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'clwvariant123' })
  @IsOptional()
  @IsString()
  variantId?: string | null;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class PlaceOrderRequestDto {
  @ApiProperty({ type: [OrderItemRequestDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemRequestDto)
  items: OrderItemRequestDto[];

  @ApiPropertyOptional({ example: 'LAUNCH25' })
  @IsOptional()
  @IsString()
  couponCode?: string | null;
}

export class ListOrdersQueryDto {
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
}
