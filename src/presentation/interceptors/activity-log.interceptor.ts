import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import {
  ActivityLogCategory,
  ActivityLogService,
} from '../../application/services';

type RequestWithUser = Request & {
  user?: {
    id?: string;
    sub?: string;
    role?: string;
    email?: string;
  };
};

interface ActivityDescriptor {
  category: ActivityLogCategory;
  action: string;
  entityType: string;
  entityId: string | null;
}

/**
 * Automatically records audit entries for mutating HTTP requests.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly activityLogService: ActivityLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const response = http.getResponse<Response>();
    const descriptor = this.describeActivity(request);

    if (!descriptor) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        void this.activityLogService.record({
          category: descriptor.category,
          action: descriptor.action,
          entityType: descriptor.entityType,
          entityId: descriptor.entityId,
          actorId: request.user?.id ?? request.user?.sub ?? null,
          details: {
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            ip: request.ip,
            userAgent: request.get('user-agent') ?? null,
            actorRole: request.user?.role ?? null,
          },
        });
      }),
    );
  }

  private describeActivity(request: Request): ActivityDescriptor | null {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      return null;
    }

    const path = (request.baseUrl || request.path || request.url).toLowerCase();
    const category = this.resolveCategory(path);
    const entityType = this.resolveEntityType(path);

    return {
      category,
      action: `${request.method}_${entityType.toUpperCase()}`,
      entityType,
      entityId: this.resolveEntityId(request),
    };
  }

  private resolveCategory(path: string): ActivityLogCategory {
    if (path.includes('/auth')) return 'AUTH';
    if (path.includes('/users')) return 'USER';
    if (path.includes('/products') || path.includes('/categories'))
      return 'PRODUCT';
    if (path.includes('/orders')) return 'ORDER';
    if (path.includes('/payments') || path.includes('/xendit'))
      return 'PAYMENT';
    if (path.includes('/deliver')) return 'DELIVERY';
    if (path.includes('/coupons') || path.includes('/vouchers'))
      return 'COUPON';
    if (path.includes('/admin')) return 'SYSTEM';
    return 'SYSTEM';
  }

  private resolveEntityType(path: string): string {
    const [segment] = path
      .replace(/^\/api\/v\d+\/?/, '')
      .split('/')
      .filter(Boolean);
    return segment?.replace(/-/g, '_') ?? 'system';
  }

  private resolveEntityId(request: Request): string | null {
    const params = request.params as Record<string, string | undefined>;
    return params.id ?? params.orderId ?? params.productId ?? null;
  }
}
