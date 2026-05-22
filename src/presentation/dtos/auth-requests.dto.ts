import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({ example: 'buyer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Jane Buyer' })
  @IsOptional()
  @IsString()
  name?: string | null;
}

export class LoginRequestDto {
  @ApiProperty({ example: 'buyer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshTokenRequestDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  @MinLength(20)
  refreshToken: string;
}
