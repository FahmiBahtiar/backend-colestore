import { BaseEntity } from '../shared/base.entity';
import { DomainError } from '../../errors';

export type UserRole = 'ADMIN' | 'BUYER';

export interface UserProps {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User aggregate root with role and activation rules.
 */
export class User extends BaseEntity {
  private props: UserProps;

  private constructor(props: UserProps) {
    super(props);
    this.props = { ...props };
    this.validate();
  }

  /** Create a User entity from persisted properties. */
  static create(props: UserProps): User {
    return new User(props);
  }

  /** User email address. */
  get email(): string {
    return this.props.email;
  }

  /** User role for authorization. */
  get role(): UserRole {
    return this.props.role;
  }

  /** Whether the user may authenticate or transact. */
  get isActive(): boolean {
    return this.props.isActive;
  }

  /** Activate the user account. */
  activate(): void {
    this.props.isActive = true;
  }

  /** Deactivate the user account. */
  deactivate(): void {
    this.props.isActive = false;
  }

  /** Assert that this user is an admin. */
  ensureAdmin(): void {
    if (this.props.role !== 'ADMIN') {
      throw new DomainError('Only admins can perform this action');
    }
  }

  /** Assert that this user is active. */
  ensureActive(): void {
    if (!this.props.isActive) {
      throw new DomainError('Inactive users cannot perform this action');
    }
  }

  /** Return plain properties for persistence or mapping. */
  toPrimitives(): UserProps {
    return { ...this.props };
  }

  private validate(): void {
    this.requireNonEmpty(this.props.email, 'User email is required');
    if (!/^\S+@\S+\.\S+$/.test(this.props.email)) {
      throw new DomainError('User email must be valid');
    }
    this.requireNonEmpty(this.props.password, 'User password hash is required');
    if (!['ADMIN', 'BUYER'].includes(this.props.role)) {
      throw new DomainError('User role must be ADMIN or BUYER');
    }
  }
}
