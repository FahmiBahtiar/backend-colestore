import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  IActivityLogRepository,
  ActivityLogEntity,
} from '../../domain/repositories/activity-log.repository';

/**
 * Concrete Prisma implementation of IActivityLogRepository.
 * Activity logs are append-only — no update or delete operations.
 */
@Injectable()
export class PrismaActivityLogRepository implements IActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a new activity log entry */
  async create(
    data: Omit<ActivityLogEntity, 'id' | 'createdAt'>,
  ): Promise<ActivityLogEntity> {
    const log = await this.prisma.activityLog.create({
      data: {
        category: data.category,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        actorId: data.actorId,
        details: data.details as Prisma.InputJsonValue | undefined,
        orderId: data.orderId,
      },
    });
    return this.toEntity(log);
  }

  /** Find logs by entity type and entity ID */
  async findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<ActivityLogEntity[]> {
    const logs = await this.prisma.activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return logs.map((l) => this.toEntity(l));
  }

  /** Find logs by category with pagination */
  async findByCategory(
    category: ActivityLogEntity['category'],
    params?: { skip?: number; take?: number },
  ): Promise<{ items: ActivityLogEntity[]; total: number }> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const where: Prisma.ActivityLogWhereInput = { category };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      items: logs.map((l) => this.toEntity(l)),
      total,
    };
  }

  /** Find all logs with pagination */
  async findAll(params?: { skip?: number; take?: number }): Promise<{
    items: ActivityLogEntity[];
    total: number;
  }> {
    const skip = params?.skip ?? 0;
    const take = params?.take ?? 20;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count(),
    ]);

    return {
      items: logs.map((l) => this.toEntity(l)),
      total,
    };
  }

  /** Map Prisma ActivityLog to domain entity */
  private toEntity(log: {
    id: string;
    category: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    actorId: string | null;
    details: Prisma.JsonValue | null;
    orderId: string | null;
    createdAt: Date;
  }): ActivityLogEntity {
    return {
      id: log.id,
      category: log.category as ActivityLogEntity['category'],
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      actorId: log.actorId,
      details: log.details as Record<string, unknown> | null,
      orderId: log.orderId,
      createdAt: log.createdAt,
    };
  }
}
