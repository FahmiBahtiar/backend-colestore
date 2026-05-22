import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ActivityLogEntity,
  IActivityLogRepository,
} from '../../domain/repositories/activity-log.repository';
import { ACTIVITY_LOG_REPOSITORY } from '../../domain/repositories/tokens';

export type ActivityLogCategory = ActivityLogEntity['category'];

export interface RecordActivityLogInput {
  category: ActivityLogCategory;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  details?: Record<string, unknown> | null;
  orderId?: string | null;
}

/**
 * Application service for append-only audit trails across important actions.
 */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepository: IActivityLogRepository,
  ) {}

  /**
   * Persist an activity log entry without interrupting the primary action.
   */
  async record(input: RecordActivityLogInput): Promise<void> {
    try {
      await this.activityLogRepository.create({
        category: input.category,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actorId: input.actorId ?? null,
        details: input.details ?? null,
        orderId: input.orderId ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to record activity log: ${message}`);
    }
  }
}
