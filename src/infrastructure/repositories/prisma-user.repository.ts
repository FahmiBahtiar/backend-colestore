import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  IUserRepository,
  UserEntity,
} from '../../domain/repositories/user.repository';
import {
  PaginatedResult,
  buildPaginatedResult,
} from '../../common/utils/pagination';

/**
 * Concrete Prisma implementation of IUserRepository.
 * Handles all User-related database operations.
 */
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Find a user by ID */
  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { pointTransactions: true },
    });
    return user ? this.toEntity(user) : null;
  }

  /** Find a user by email address */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { pointTransactions: true },
    });
    return user ? this.toEntity(user) : null;
  }

  /** Find all users with pagination */
  async findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<PaginatedResult<UserEntity>> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        include: { pointTransactions: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return buildPaginatedResult(
      users.map((u) => this.toEntity(u)),
      total,
      Math.floor(skip / take) + 1,
      take,
    );
  }

  /** Find only active users with pagination */
  async findActiveUsers(params?: {
    skip?: number;
    take?: number;
  }): Promise<{ items: UserEntity[]; total: number }> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const where: Prisma.UserWhereInput = { isActive: true };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: { pointTransactions: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => this.toEntity(u)),
      total,
    };
  }

  /** Create a new user */
  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email!,
        password: data.password!,
        name: data.name,
        role: data.role ?? 'BUYER',
        isActive: data.isActive ?? true,
      },
    });
    this.eventEmitter.emit('user.created', { userId: user.id });
    return this.toEntity(user);
  }

  /** Update an existing user */
  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.password !== undefined && { password: data.password }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    this.eventEmitter.emit('user.updated', { userId: user.id });
    return this.toEntity(user);
  }

  /** Delete a user by ID */
  async delete(id: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    await this.prisma.user.delete({ where: { id } });
  }

  /** Find multiple users by their IDs */
  async findByIds(ids: string[]): Promise<UserEntity[]> {
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
    });
    return users.map((u) => this.toEntity(u));
  }

  /** Map Prisma User to domain entity */
  private toEntity(user: {
    id: string;
    email: string;
    password: string;
    name: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    pointTransactions?: { type: string; points: number }[];
  }): UserEntity {
    let totalPoints = undefined;
    if (user.pointTransactions) {
      const earned = user.pointTransactions
        .filter((p) => p.type === 'EARNED')
        .reduce((sum, p) => sum + p.points, 0);
      const spent = user.pointTransactions
        .filter((p) => p.type === 'REFUNDED' || p.type === 'REDEEMED')
        .reduce((sum, p) => sum + p.points, 0);
      totalPoints = Math.max(0, earned - spent);
    }
    return {
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role as UserEntity['role'],
      isActive: user.isActive,
      totalPoints,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
