import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../common/utils/api-response';
import { SKIP_TRANSFORM_KEY } from '../../common/decorators/skip-transform.decorator';

/**
 * TransformInterceptor wraps all successful responses in the
 * standard ApiResponse format automatically.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      // Bypass response wrapping entirely for annotated handlers
      return next.handle() as Observable<ApiResponse<T>>;
    }

    return next.handle().pipe(
      map((data: unknown): ApiResponse<T> => {
        // If it's already an ApiResponse, return as-is
        if (data instanceof ApiResponse) {
          return data as ApiResponse<T>;
        }

        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        const statusCode = response.statusCode;
        return ApiResponse.success<T>(data as T, 'Success', statusCode);
      }),
    );
  }
}
