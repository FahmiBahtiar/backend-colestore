import { DomainError } from '../../errors';
import { User, UserProps } from './user.entity';

const now = new Date('2026-01-01T00:00:00.000Z');

function makeUser(overrides: Partial<UserProps> = {}): User {
  return User.create({
    id: 'user-1',
    email: 'buyer@example.com',
    password: 'hashed-password',
    name: 'Buyer',
    role: 'BUYER',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe('User entity', () => {
  it('creates an active buyer with valid properties', () => {
    const user = makeUser();

    expect(user.email).toBe('buyer@example.com');
    expect(user.role).toBe('BUYER');
    expect(user.isActive).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(() => makeUser({ email: 'invalid-email' })).toThrow(DomainError);
  });

  it('allows only admins to pass admin checks', () => {
    expect(() => makeUser().ensureAdmin()).toThrow(DomainError);
    expect(() => makeUser({ role: 'ADMIN' }).ensureAdmin()).not.toThrow();
  });

  it('prevents inactive users from acting', () => {
    const user = makeUser({ isActive: false });

    expect(() => user.ensureActive()).toThrow(DomainError);

    user.activate();

    expect(() => user.ensureActive()).not.toThrow();
  });

  it('can deactivate users', () => {
    const user = makeUser();

    user.deactivate();

    expect(user.isActive).toBe(false);
  });
});
