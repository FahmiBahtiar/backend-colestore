export interface RegisterUserInputDto {
  email: string;
  password: string;
  name?: string | null;
}

export interface LoginInputDto {
  email: string;
  password: string;
}

export interface RefreshTokenInputDto {
  refreshToken: string;
}

export interface AuthUserResponseDto {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'BUYER';
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseDto extends AuthTokensDto {
  user: AuthUserResponseDto;
}
