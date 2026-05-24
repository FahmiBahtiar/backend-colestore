import type { LogCategory } from '../../../domain/entities';

export type ActivityLogDto = {
  id: string;
  category: LogCategory;
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  details: Record<string, unknown> | null;
  orderId: string | null;
  createdAt: Date;
};

export type ActivityLogListResponseDto = {
  items: ActivityLogDto[];
  total: number;
  skip: number;
  take: number;
};

export type GetActivityLogsInputDto = {
  category?: LogCategory;
  skip?: number;
  take?: number;
};
