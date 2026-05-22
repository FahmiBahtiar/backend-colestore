import { IBaseRepository } from './base.repository';

export interface UserEntity {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: 'ADMIN' | 'BUYER';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User repository interface — domain layer contract.
 */
export interface IUserRepository extends IBaseRepository<UserEntity> {
  findByEmail(email: string): Promise<UserEntity | null>;
  findActiveUsers(params?: {
    skip?: number;
    take?: number;
  }): Promise<{ items: UserEntity[]; total: number }>;
}
