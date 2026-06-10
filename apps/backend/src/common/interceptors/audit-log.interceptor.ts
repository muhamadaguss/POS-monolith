import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { SKIP_AUDIT_LOG_KEY } from '../decorators/skip-audit-log.decorator';
import type { AuthenticatedUser } from '../types/jwt-payload.type';

// Hanya method yang mengubah data yang perlu di-log
const MUTABLE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Kata kunci sub-resource (bukan ID) pada segmen ke-2.
const SUB_KEYWORDS = ['open', 'close', 'void', 'export', 'refund', 'approve', 'reject', 'cancel'];

/**
 * Pecah path menjadi segmen TANPA prefix global `api/v1`.
 * Tanpa ini, segments[0] selalu "api" → menghasilkan action jelek (API_PRODUCTS).
 */
function pathSegments(path: string): string[] {
  const segs = path.split('?')[0].split('/').filter(Boolean);
  if (segs[0] === 'api') segs.shift(); // buang "api"
  if (/^v\d+$/.test(segs[0] ?? '')) segs.shift(); // buang "v1"
  return segs;
}

// Map HTTP method + path → action name yang human-readable
function resolveAction(method: string, segments: string[]): string {
  const resource = segments[0] ?? 'unknown';
  const sub = segments[2]; // e.g. "void", "close", "open"

  if (method === 'DELETE') return `${resource.toUpperCase()}_DELETE`;
  if (method === 'PATCH' || method === 'PUT') {
    if (sub) return `${resource.toUpperCase()}_${sub.toUpperCase()}`;
    return `${resource.toUpperCase()}_UPDATE`;
  }
  // POST
  if (sub) return `${resource.toUpperCase()}_${sub.toUpperCase()}`;
  return `${resource.toUpperCase()}_CREATE`;
}

function resolveResource(segments: string[]): { resource: string; resourceId?: string } {
  const resource = segments[0] ?? 'unknown';
  // segments[1] adalah ID jika bukan sub-resource keyword
  const maybeId = segments[1];
  const resourceId =
    maybeId && !SUB_KEYWORDS.includes(maybeId)
      ? maybeId
      : segments[3]; // e.g. /transactions/:id/void
  return { resource, resourceId };
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const { method, path, ip } = request;
    const userAgent = request.headers['user-agent'];

    if (!MUTABLE_METHODS.has(method)) return next.handle();

    const user = request['user'] as AuthenticatedUser | undefined;

    return next.handle().pipe(
      tap(() => {
        const segments = pathSegments(path);
        const action = resolveAction(method, segments);
        const { resource, resourceId } = resolveResource(segments);

        void this.auditLogsService.log({
          tenantId: user?.tenantId ?? null,
          userId: user?.userId ?? null,
          action,
          resource,
          resourceId,
          ipAddress: ip ?? null,
          userAgent: userAgent ?? null,
        });
      }),
    );
  }
}
