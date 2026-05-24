import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../auth/authenticated-user';

/**
 * Guard that extracts jwt payload if present in Authorization header,
 * but allows guest users (req.user remains null) without throwing an error.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: unknown, user: AuthenticatedUser | false | null) {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
