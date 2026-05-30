import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemCheckoutAnswerRequestDto {
  @ApiPropertyOptional({ example: 'clwfield123' })
  @IsOptional()
  @IsString()
  checkoutFieldId?: string | null;

  @ApiProperty({ example: 'ID Game' })
  @IsString()
  label: string;

  @ApiProperty({ example: 'player123' })
  @IsString()
  value: string;
}

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

  @ApiPropertyOptional({ type: [OrderItemCheckoutAnswerRequestDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemCheckoutAnswerRequestDto)
  checkoutAnswers?: OrderItemCheckoutAnswerRequestDto[];
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

  @ApiProperty({ example: 'customer@example.com' })
  @IsString()
  @IsEmail({}, { message: 'Format email tidak valid' })
  customerEmail: string;

  @ApiProperty({ example: '081234567890' })
  @IsString()
  customerWhatsapp: string;

  @ApiProperty({
    example: 'VIRTUAL_ACCOUNT',
    description: 'Payment method type: VIRTUAL_ACCOUNT, QR_CODE, EWALLET',
  })
  @IsString()
  paymentMethodType: string;

  @ApiProperty({
    example: 'BCA',
    description: 'Payment channel code, e.g. BCA, BNI, QRIS, OVO, DANA',
  })
  @IsString()
  paymentChannel: string;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  skip?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  take?: number;

  @ApiPropertyOptional({ example: 'PAID' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    example: 'customer@example.com',
    description: 'Search by ID, email, or Whatsapp',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: '2026-05-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-05-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'NEWEST',
    description: 'NEWEST, OLDEST, AMOUNT_DESC, AMOUNT_ASC',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Cursor for next page pagination (base64 JSON)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
