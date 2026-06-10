import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;           // user_id
  email: string;
  tenantId: string | null;
  currentOutletId: string | null;
  role: Role;
  permissions: string[];
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
  currentOutletId: string | null;
}

// Shape yang diinjeksikan ke request setelah guard memvalidasi token
export interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId: string | null;
  currentOutletId: string | null;
  role: Role;
  permissions: string[];
}
