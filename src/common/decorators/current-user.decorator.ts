import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Custom param decorator to extract the current authenticated user from the request.
 * @example
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: UserEntity) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (data && user) {
      return (user as Record<string, unknown>)[data];
    }

    return user;
  },
);
