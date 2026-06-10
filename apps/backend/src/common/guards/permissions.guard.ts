import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, ANY_PERMISSION_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();

    // AND logic — semua permission harus dimiliki
    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredAll && requiredAll.length > 0) {
      if (!user) throw new ForbiddenException('Akses ditolak');
      const hasAll = requiredAll.every((p) => user.permissions.includes(p));
      if (!hasAll) throw new ForbiddenException('Anda tidak memiliki izin untuk tindakan ini');
    }

    // OR logic — cukup salah satu permission
    const requiredAny = this.reflector.getAllAndOverride<string[]>(ANY_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredAny && requiredAny.length > 0) {
      if (!user) throw new ForbiddenException('Akses ditolak');
      const hasAny = requiredAny.some((p) => user.permissions.includes(p));
      if (!hasAny) throw new ForbiddenException('Anda tidak memiliki izin untuk tindakan ini');
    }

    return true;
  }
}
