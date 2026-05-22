export const QUEUE_NAMES = {
  PAYMENT_WEBHOOK: 'payment-webhook',
  ORDER_PROCESSING: 'order-processing',
  ACTIVITY_LOG: 'activity-log',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
  timeout: 30000,
} as const;
