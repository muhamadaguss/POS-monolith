import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.type';

// Urutan hierarki role — role lebih tinggi mencakup role di bawahnya
const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 4,
  [Role.TENANT_OWNER]: 3,
  [Role.STORE_MANAGER]: 2,
  [Role.CASHIER]: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    if (!user) throw new ForbiddenException('Akses ditolak');

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const hasRole = requiredRoles.some((r) => userLevel >= ROLE_HIERARCHY[r]);

    if (!hasRole) throw new ForbiddenException(`Akses ditolak. Role yang dibutuhkan: ${requiredRoles.join(' atau ')}`);
    return true;
  }
}
