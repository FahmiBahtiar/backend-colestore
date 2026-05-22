import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeliverOrderRequestDto {
  @ApiPropertyOptional({ example: 'Delivered via email with setup notes.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  deliveryNote?: string | null;
}
