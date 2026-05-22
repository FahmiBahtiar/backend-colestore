import { BadRequestException } from '@nestjs/common';
import { DomainError } from '../../domain/errors';

/** Translate domain validation errors into client-facing HTTP errors. */
export function throwBadRequestForDomainError(error: unknown): never {
  if (error instanceof DomainError) {
    throw new BadRequestException(error.message);
  }
  throw error;
}
