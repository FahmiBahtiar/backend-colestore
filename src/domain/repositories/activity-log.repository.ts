export interface ActivityLogEntity {
  id: string;
  category:
    | 'AUTH'
    | 'USER'
    | 'PRODUCT'
    | 'ORDER'
    | 'PAYMENT'
    | 'DELIVERY'
    | 'COUPON'
    | 'SYSTEM'
    | 'SECURITY';
  action: string;
  entityType: string | null;
  entityId: string | null;
  actorId: string | null;
  details: Record<string, unknown> | null;
  orderId: string | null;
  createdAt: Date;
}

/**
 * ActivityLog repository interface — domain layer contract.
 */
export interface IActivityLogRepository {
  create(
    data: Omit<ActivityLogEntity, 'id' | 'createdAt'>,
  ): Promise<ActivityLogEntity>;
  findByEntityId(
    entityType: string,
    entityId: string,
  ): Promise<ActivityLogEntity[]>;
  findByCategory(
    category: ActivityLogEntity['category'],
    params?: { skip?: number; take?: number },
  ): Promise<{ items: ActivityLogEntity[]; total: number }>;
  findAll(params?: {
    skip?: number;
    take?: number;
  }): Promise<{ items: ActivityLogEntity[]; total: number }>;
}
