import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/rbac/permissions';
import type { AuthenticatedUser } from '../../common/types/jwt-payload.type';
import { Role } from '@prisma/client';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequireAnyPermission(PERMISSIONS.REPORT_VIEW, PERMISSIONS.STAFF_MANAGE_GLOBAL)
  @ApiOperation({
    summary: 'Daftar audit log',
    description: 'Hanya Tenant Owner dan Super Admin yang dapat melihat seluruh audit log tenant.',
  })
  findAll(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: AuditLogQueryDto) {
    // Super Admin bisa lihat semua tenant (tenantId = null)
    const tenantId = currentUser.role === Role.SUPER_ADMIN ? null : currentUser.tenantId ?? null;
    return this.auditLogsService.findAll(tenantId, query);
  }
}
