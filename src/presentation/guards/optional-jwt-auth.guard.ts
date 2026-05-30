import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../auth/authenticated-user';

/**
 * Guard that extracts jwt payload if present in Authorization header,
 * but allows guest users (req.user remains null) without throwing an error.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser | null>(
    err: unknown,
    user: AuthenticatedUser | false | null,
  ): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user as TUser;
  }
}
