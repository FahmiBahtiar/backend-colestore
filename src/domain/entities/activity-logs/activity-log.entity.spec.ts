/// <reference types="jest" />

import { DomainError } from '../../errors';
import { ActivityLog, ActivityLogProps } from './activity-log.entity';

const now = new Date('2026-01-01T00:00:00.000Z');

function makeActivityLog(
  overrides: Partial<ActivityLogProps> = {},
): ActivityLog {
  return ActivityLog.create({
    id: 'log-1',
    category: 'PRODUCT',
    action: 'POST_PRODUCTS',
    entityType: 'products',
    entityId: 'product-1',
    actorId: 'admin-1',
    details: { method: 'POST' },
    orderId: null,
    createdAt: now,
    ...overrides,
  });
}

describe('ActivityLog entity', () => {
  it('creates append-only audit records with valid properties', () => {
    const log = makeActivityLog();

    expect(log.toPrimitives()).toMatchObject({
      category: 'PRODUCT',
      action: 'POST_PRODUCTS',
      entityType: 'products',
    });
  });

  it('rejects empty actions', () => {
    expect(() => makeActivityLog({ action: '' })).toThrow(DomainError);
  });

  it('rejects invalid categories at runtime', () => {
    expect(() =>
      makeActivityLog({
        category: 'INVALID' as ActivityLogProps['category'],
      }),
    ).toThrow(DomainError);
  });
});
