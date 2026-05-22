import { DomainError } from '../../errors';

export interface BaseEntityProps {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Base entity with shared invariant helpers for domain models.
 */
export abstract class BaseEntity {
  protected constructor(protected readonly baseProps: BaseEntityProps) {
    this.requireNonEmpty(baseProps.id, 'Entity id is required');
    this.requireDate(baseProps.createdAt, 'createdAt must be a valid date');
    if (baseProps.updatedAt) {
      this.requireDate(baseProps.updatedAt, 'updatedAt must be a valid date');
    }
  }

  /** Entity unique identifier. */
  get id(): string {
    return this.baseProps.id;
  }

  /** Entity creation timestamp. */
  get createdAt(): Date {
    return this.baseProps.createdAt;
  }

  /** Entity last update timestamp when available. */
  get updatedAt(): Date | undefined {
    return this.baseProps.updatedAt;
  }

  protected requireNonEmpty(
    value: string | null | undefined,
    message: string,
  ): void {
    if (!value || value.trim().length === 0) {
      throw new DomainError(message);
    }
  }

  protected requirePositive(value: number, message: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DomainError(message);
    }
  }

  protected requireNonNegative(value: number, message: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new DomainError(message);
    }
  }

  protected requireInteger(value: number, message: string): void {
    if (!Number.isInteger(value)) {
      throw new DomainError(message);
    }
  }

  protected requireDate(value: Date, message: string): void {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      throw new DomainError(message);
    }
  }
}
