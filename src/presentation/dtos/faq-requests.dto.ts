import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFaqRequestDto {
  @ApiProperty({ example: 'Do You Offer Revisions On Designs?' })
  @IsString()
  @MinLength(3)
  question: string;

  @ApiProperty({ example: 'Yes, I provide revisions to ensure...' })
  @IsString()
  @MinLength(3)
  answer: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqRequestDto {
  @ApiPropertyOptional({ example: 'Do You Offer Revisions On Designs?' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  question?: string;

  @ApiPropertyOptional({ example: 'Yes, I provide revisions to ensure...' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  answer?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListFaqsQueryDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }: { value: string | number }) =>
    typeof value === 'number' ? value : parseInt(value, 10),
  )
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Transform(({ value }: { value: string | number }) =>
    typeof value === 'number' ? value : parseInt(value, 10),
  )
  @IsInt()
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'revision' })
  @IsOptional()
  @IsString()
  search?: string;
}
