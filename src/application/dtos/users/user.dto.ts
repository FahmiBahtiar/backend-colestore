export interface UserResponseDto {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'BUYER';
  isActive: boolean;
  totalPoints?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListUsersInputDto {
  skip?: number;
  take?: number;
  search?: string;
  role?: string;
}

export interface UpdateUserInputDto {
  id: string;
  name?: string | null;
  role?: 'ADMIN' | 'BUYER';
  isActive?: boolean;
}
