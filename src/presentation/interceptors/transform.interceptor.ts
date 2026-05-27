import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../../common/utils/api-response';

/**
 * TransformInterceptor wraps all successful responses in the
 * standard ApiResponse format automatically.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: unknown): ApiResponse<T> => {
        // If it's already an ApiResponse, return as-is
        if (data instanceof ApiResponse) {
          return data as ApiResponse<T>;
        }

        const request = context.switchToHttp().getRequest<{ url: string }>();
        // Bypass transformation for payment webhook endpoints specifically
        if (request.url.includes('/payments/duitku/webhook')) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return data as any;
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
