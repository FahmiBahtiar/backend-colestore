export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'BUYER';
}

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: 'ADMIN' | 'BUYER';
}
